import { default as Web3 } from "web3";
import { default as contract } from "truffle-contract";
import dataShareArtifacts from "../../../build/contracts/DataShare.json";

var DataShare = contract(dataShareArtifacts);

const ipfsAPI = require('ipfs-api');
//const ipfs = ipfsAPI({host: 'ipfs.infura.io', port: '5001', protocol: 'https'});
const ipfs = ipfsAPI({host: 'localhost', port: '5001', protocol: 'http'});

window.App = {
  instance: null,
  account: null,
  addr: null,
  maxIndex: 0,
  start: async function(){
    // 得到合约实例
    DataShare.setProvider(web3.currentProvider);
    this.instance = await DataShare.deployed();

    // 得到数据集数量
    let idx = await this.instance.getIndex();
    this.maxIndex = Number(idx);

    // 得到用户
    this.addr = await web3.eth.getAccounts();
    this.account = await this.instance.getSelfInfo({from: this.addr[0]});
    // 用户还未注册则弹出模态框进行注册
    if(this.account[2] == false){
      registerAccount();
    }

    changeNavbrByAccount();

    // 渲染首页下方数据列表
    if($('#data-section').length > 0){
      renderDataList();
    }
    
    if($('#dataset-info').length > 0){
      /* 将文件读取到缓冲区 */
      var reader;
      $('#dataset-file').change(event=>{
        const file = event.target.files[0];
        reader = new window.FileReader();
        reader.readAsArrayBuffer(file);
      });

      /* 提交数据集信息表单 */
      $('#dataset-info').submit(event=>{
        // 如之前跳过了注册，此时会再次弹出注册提醒
        if(App.account[2] == false){
          $('#set-name-modal').find('p').text('你还没为自己取名，命名后可继续下一步操作。');
          $('#set-name-modal').modal();
          return false;
        }
        const req = $('#dataset-info').serialize();
        //console.log("serialize: ", req);
        let params = JSON.parse('{"' + req.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
        //console.log("params: ", params);

        let decodeParams = {};
        Object.keys(params).forEach(key=>{
          decodeParams[key] = decodeURIComponent(decodeURI(params[key]));
        });

        uploadData(reader, decodeParams);

        return false;
      });
    }

    // 根据id跳转到数据集详情页面
    $('#search-btn').click(function(){
      let keyword = $('#search-id').val();
      if(/^[\s]*$/.test(keyword.trim())){
        window.alert('输入无效!');
      }
      else{
        window.location.href = "list.html?keyword=" + keyword.trim();
      }
    });

    if($('#dataset-detail').length > 0){
      //console.log('yes!');
      let datasetId = new URLSearchParams(window.location.search).get('id');
      renderDetailPage(datasetId);
    }
  }
};

window.addEventListener('load', function(){
  // 检查新版MetaMask
  if (window.ethereum) {
    try {
      // 请求用户账号授权
      window.ethereum.enable().then((e)=>{
        // 授权后对页面进行渲染
        web3 = new Web3(window.ethereum);
        App.start();
      });
    } catch (error) {
      // 用户拒绝了访问
      console.error("用户拒绝了访问");
    }
  }
  else{
    web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8546"));
    App.start();
  }
});

/* 弹出模态框，提醒用户未注册，并显示注册框 */
async function registerAccount(){
  $('#set-name-modal').find('p').text(function(i,origText){
    return App.addr[0] + origText;
  });

  // 根据实时输入判断名称是否合法
  $('#account-name').on('input propertychange', function(){
    if(/^\S{1,12}$/.test($(this).val())){
      $('.modal-body .alert-success').show();
      $('.modal-body .alert-danger').hide();
    }
    else{
      $('.modal-body .alert-success').hide();
      $('.modal-body .alert-danger').show();
    }
  });

  // 绑定注册方法
  $('#okay-btn').on('click', async function(){
    if(!/^\S{1,12}$/.test($('#account-name').val())){
      return;
    }
    $('#set-name-modal').modal('hide');
    App.account[0] = $('#account-name').val();
    App.account[2] = true;
    await App.instance.setUser(App.account[0], {from: App.addr[0]});
    $('#navbarNav li.dropdown').show();
  });

  $('#set-name-modal').modal();
}

/* 根据用户是否注册来改变导航栏 */
function changeNavbrByAccount(){
  if(App.account[2] == false){
    $('#navbarNav li.dropdown').hide();
  }
  else{
    $('#usr-name').html(App.account[0] + '<small id="usr-point"> ' + App.account[1].toString() + '积分</small>');
    $('#navbarNav li.dropdown').show();
  }
}

/* 上传数据 */
function uploadData(reader, params){
  let dataLink;
  uploadDataOnIpfs(reader).then(link=>{
    dataLink = link;
    console.log(link);
    uploadDataSetToBlockchain(params, dataLink);
  });
}

/* 上传文件至ipfs */
function uploadDataOnIpfs(reader){
  return new Promise((resolve, reject)=>{
    let buffer = Buffer.from(reader.result);
    ipfs.add(buffer).then(res=>{
      console.log(res[0].hash);
      resolve(res[0].hash);
    }).catch(err=>{
      console.error(err);
      reject(err);
    });
  });
}

/* 上传数据信息至区块链 */
async function uploadDataSetToBlockchain(params, dataLink){
  console.log("Upload to blockchain params: ", params);
  if(params['dataset-desc'] == ""){
    params['dataset-desc'] = "无";
  }
  await App.instance.uploadData(params['dataset-name'], params['dataset-category'], params['dataset-desc'], dataLink, 100, {from: App.addr[0]});
  App.maxIndex++;
  console.log('Transaction complete!');
  autoJumpAfterWaiting();
}

/* 交易被接受后三秒自动跳转至详情页 */
function autoJumpAfterWaiting(){
  // 上传结束3s后跳转至详情页
  setTimeout(function(){
    var time = 2;
    $('#msg').show();
    var timer = setInterval(function(){
      if(time == 0){
        clearInterval(timer);
        document.getElementById("msg").innerHTML = '正在跳转...';
        window.location.href = "detail.html?id=" + App.maxIndex;
      }
      else{
        document.getElementById("msg").innerHTML = '上传成功！' + time + 's后跳转至详情页...';
        time--;
      }
    }, 1000);
  });
}

/* 根据文件hash从ipfs中下载 */
function downloadFromIpfs(hash){
  //console.log('shot');
  // ajax根据请求的链接返回的blob下载文件
  var x = new XMLHttpRequest();
  //x.open('GET', "https://ipfs.infura.io/ipfs/" + hash, true);
  x.open('GET', "http://localhost:8081/ipfs/" + hash, true);
  x.responseType = 'blob';
  x.onload = function(){
    let url = window.URL.createObjectURL(x.response);
    var a = document.createElement('a');
    a.download = hash;
    a.href = url;
    $("body").append(a);
    a.click();
    $(a).remove();
  }
  x.send();
}

/* 渲染详情页 */
function renderDetailPage(id){
  if(Number(id) > App.maxIndex){
    window.location.href = "index.html";
  }
  DataShare.deployed().then(x=>{
    x.getDataSet(id).then(res=>{
      $('#res-id').html(id);
      $('#res-name').html(res[0]);
      $('#res-category').html(res[1]);
      $('#res-desc').html(res[2]);
      $('#res-uper').html(res[3]);
      $('#res-downloads').html(res[5] + '次下载');
      $('#res-time').html(timestampToDate(res[6].toString()));
      /* 下载数据集按钮点击事件 */
      $('#download-btn').click(async function(){
        if(App.account[2] == false){
          $('#set-name-modal').find('p').text('你还没为自己取名，命名后可继续下一步操作。');
          $('#set-name-modal').modal();
          return false;
        }

        // 如果已经下过该数据，则再次下载不再增加下载量
        App.instance.checkHasDownload(id, {from: App.addr[0]}).then(async flag=>{
          if(!flag){
            await App.instance.addDownloads(id, 10, {from: App.addr[0]});
            // 刷新页面的下载次数
            $('#res-downloads').text(function(i,origText){
              return (Number(origText.substr(0, origText.length - 3)) + 1) + "次下载";
            });
          }
          downloadFromIpfs(res[4]);
        });
      });
      $('#dataset-detail').show();
    });
  });
}

/* 将时间戳转化为时间格式{年/月/日 12小时制} */
function timestampToDate(time){
  return new Date(parseInt(time) * 1000).toLocaleString().replace(/:\d{1,2}$/,' ');;
}

/**
 * 渲染首页下方数据列表
 * 包括分页组件的生成，根据当前分页请求相应序号的数据
 */
async function renderDataList(){
  var capacity = 12;    // 每页显示多少个数据项
  var pagesCount = 0;   // 一共的页数
  var lastPage = 0;     // 最后一页的数据项个数
  var curPage = 1;      // 当前页码
  var datalist = [];
  var param = new URLSearchParams(window.location.search);

  // 初次加载
  if(!param.has('type') && !param.has('keyword')){
    pagesCount = Math.ceil(App.maxIndex / capacity);
    lastPage = App.maxIndex % capacity;
    if(pagesCount == 1){
      initDatalist(Array.from({length: lastPage},(item, index)=>index+1));
    }
    else{
      initDatalist(Array.from({length: capacity},(item, index)=>App.maxIndex-capacity+index+1));
    }
  }
  else if(param.has('keyword')){
    let keyword = param.get('keyword');
    let keywords = keyword.replace(/\s+/g, ' ').split(' ');
    $('h4').html('搜索结果');
    for(var i = 1; i <= App.maxIndex; i++){
      let dataname = (await App.instance.getDataName(i, {from: App.addr[0]}));
      for(var j = 0; j < keywords.length; j++){
        if((new RegExp(keywords[j],'i')).test(dataname)){
          datalist.push(i);
          break;
        }
      }
    }
    let section = datalist.length < capacity ? datalist : datalist.slice(datalist.length - capacity, datalist.length);
    pagesCount = Math.ceil(datalist.length / capacity);
    lastPage = datalist.length % capacity;
    initDatalist(section);
  }
  else{
    let listType = param.get('type');
    if(listType == "myupload"){
      $('h4').html(App.account[0] + ' / 上传记录');
      datalist = (await App.instance.getUserAllUploadId({from: App.addr[0]})).map(Number);
    }
    else if(listType == "mydownload"){
      $('h4').html(App.account[0] + ' / 下载记录');
      datalist = (await App.instance.getUserAllDownloadId({from: App.addr[0]})).map(Number);
    }
    else{
      $('h4').html('分类 / ' + listType);
      datalist = (await App.instance.getDataIdByCategory(listType, {from: App.addr[0]})).map(Number);
    }
    let section = datalist.length < capacity ? datalist : datalist.slice(datalist.length - capacity, datalist.length);
    pagesCount = Math.ceil(datalist.length / capacity);
    lastPage = datalist.length % capacity;
    initDatalist(section);
  }
  
  generatePagination(pagesCount);
  
  // 为不同分页按钮绑定不同方法
  $('.custom-pagination li a').click(function(){
    var idx;
    // 点击“上一页”时的逻辑
    if($(this).hasClass('prev-page')){
      curPage--;
      idx = $('.custom-pagination li a.active').parent().index('.custom-pagination li') - 1;
      adjustPagination($('.custom-pagination li:eq('+ idx +') a'), pagesCount);
    }
    // 点击“下一页”时的逻辑
    else if($(this).hasClass('next-page')){
      curPage++;
      idx = $('.custom-pagination li a.active').parent().index('.custom-pagination li') + 1;
      adjustPagination($('.custom-pagination li:eq('+ idx +') a'), pagesCount);
    }
    // 点击当前页页码时的逻辑
    else if($(this).hasClass('active')){
      return;
    }
    // 点击其他页码时的逻辑
    else{
      curPage = Number($(this).html());
      adjustPagination($(this), pagesCount);
    }
    // 跳转页面后更新item中的值，重新渲染列表
    let section;
    if(!param.has('type') && !param.has('keyword')){
      if(curPage != pagesCount || lastPage == 0){
        section = Array.from({length:capacity},(item, index)=>App.maxIndex-curPage*capacity+index+1);
      }
      else{
        section = Array.from({length:lastPage},(item, index)=>index+1);
      }
    }
    else{
      section = (curPage == pagesCount && lastPage != 0) ? datalist.slice(0, lastPage) : datalist.slice(datalist.length-curPage*capacity, datalist.length-(curPage-1)*capacity);
    }
    changeItemContent(capacity, section);
  });
}

function initDatalist(section){
  for(var i = section.length - 1; i >= 0; i--){
    let id = section[i];
    App.instance.getDataSet(id).then(res=>{
      $('#data-list').append(buildDataItem(id, res));
    });
  }
}

/* 创建列表中一个数据集元素 */
function buildDataItem(id, dataInfo){
  let item = $('<div class="col-12 col-sm-12 col-md-6 col-lg-4 px-2 mb-4 mb-lg-3 aos-init" \
  data-aos="fade-up"></div>');
  let content = $('<div class="data-item-content"></div>');
  content.append('<h4 id="item-name">' + dataInfo[0] + '</h4>');
  content.append('<p class="text-muted" id="item-uper">' + dataInfo[3] + '</p>');
  content.append('<small class="text-muted" id="item-time">于 ' + timestampToDate(dataInfo[6].toString()) + '上传</small>')
  content.append('<small class="text-muted" id="item-category"> · ' + dataInfo[1]);
  content.append('<p id="item-desc">' + dataInfo[2] + '</p>');
  content.append('<small class="text-muted" id="item-downloads">' + dataInfo[5] + '次下载</small>');
  content.on('click', function(e){
    window.location.href = "detail.html?id=" + id;
  });
  item.append(content);
  return item;
}

/* 根据当前页改变item中的值 */
function changeItemContent(itemCount, section){
  for(var i = 0; i < itemCount; i++){
    if(i < section.length){
      let item = $('.data-item-content').eq(section.length - i - 1);
      let id = section[i];
      let content = item.children();
      App.instance.getDataSet(id).then(res=>{
        $(content[0]).html(res[0]);
        $(content[1]).html(res[3]);
        $(content[2]).html(timestampToDate(res[6].toString()));
        $(content[3]).html(res[1] + '次下载');
        $(content[4]).html(res[2]);
        $(content[5]).html(res[5] + '次下载');
        item.off('click').on('click', function(e){
          window.location.href = "detail.html?id=" + id;
        });
        item.parent().show();
      });
    }
    else{
      $('.data-item-content').eq(i).parent().hide();
    }
  }
}

/* 生成初始分页 */
function generatePagination(pagesCount){
  if(pagesCount < 2){
    return;
  }

  if(pagesCount <= 7){
    for(var i = 2; i <= pagesCount; i++){
      $('.custom-pagination').append('<li><a href="#data-section">' + i + '</a></li>');
    }
  }
  else{
    for(var i = 2; i <= 6; i++){
      $('.custom-pagination').append('<li><a href="#data-section">' + i + '</a></li>');
    }
    $('.custom-pagination').append('<strong class="next-ellipsis">...</strong>');
    $('.custom-pagination').append('<li><a href="#data-section">' + pagesCount + '</a></li>');
  }
  $('.custom-pagination').append('<li><a class="next-page" href="#data-section">下一页</a></li>');
}

/* 根据点击的页号调整分页样式 */
function adjustPagination(obj, pagesCount){
  var curPage = Number(obj.html());

  $('.custom-pagination li a').removeClass('active');
  if(pagesCount <= 7){
    obj.addClass('active');
  }
  else{
    if(curPage <= 4){
      obj.addClass('active');
      $('.prev-ellipsis').hide();
      $('.next-ellipsis').show();
      for(var i = 1; i <= 6; i++){
        $('.custom-pagination li:eq(' + i + ') a').html(i);
      }
    }
    else if(curPage >= pagesCount - 3){
      obj.addClass('active');
      $('.prev-ellipsis').show();
      $('.next-ellipsis').hide();
      for(var i = 2; i <= 6; i++){
        $('.custom-pagination li:eq(' + i + ') a').html(pagesCount - (7 - i));
      }
    }
    else{
      $('.custom-pagination li:eq(4) a').addClass('active');
      $('.prev-ellipsis').show();
      $('.next-ellipsis').show();
      for(var i = 2; i <= 6; i++){
        $('.custom-pagination li:eq('+ i +') a').html(curPage + (i - 4));
      }
    }
  }

  if(curPage == 1){
    $('.prev-page').hide();
    $('.next-page').show();
  }
  else if(curPage == pagesCount){
    $('.prev-page').show();
    $('.next-page').hide();
  }
  else{
    $('.prev-page').show();
    $('.next-page').show();
  }
}

