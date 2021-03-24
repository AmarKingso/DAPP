import { default as Web3 } from "web3";
import { default as contract } from "truffle-contract";
import dataShareArtifacts from "../../build/contracts/DataShare.json";

var DataShare = contract(dataShareArtifacts);

const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI({host: 'localhost', port: '5001', protocol: 'http'});

window.App = {
  instance: null,
  account: null,
  maxIndex: 0,
  start: async function(){
    var self = this;

    DataShare.setProvider(web3.currentProvider);
    this.instance = await DataShare.deployed();

    let idx = await this.instance.getIndex();
    this.maxIndex = Number(idx);

    // 得到用户地址
    const accounts = await web3.eth.getAccounts();
    this.account = accounts[0];

    renderDataList();
    
    /* 将文件读取到缓冲区 */
    var reader;
    $('#dataset-file').change(event=>{
      const file = event.target.files[0];
      reader = new window.FileReader();
      reader.readAsArrayBuffer(file);
    });
    
    /* 提交数据集信息表单 */
    $('#dataset-info').submit(event=>{
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

    /* 根据id跳转到数据集详情页面 */
    $('#search-btn').click(function(){
      jumpToDetail();
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
    App.web3Provider = window.ethereum;
    try {
      // 请求用户账号授权
      window.ethereum.enable();
    } catch (error) {
      // 用户拒绝了访问
      console.error("用户拒绝了访问");
    }
  }
  else if(window.web3){
    App.web3Provider = window.web3.currentProvider;
  }
  else{
    App.web3Provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
  }
  web3 = new Web3(App.web3Provider);

  App.start();
});

function uploadData(reader, params){
  let dataLink;
  uploadDataOnIpfs(reader).then(link=>{
    dataLink = link;
    uploadDataSetToBlockchain(params, dataLink);
  });
}

function uploadDataOnIpfs(reader){
  return new Promise((resolve, reject)=>{
    let buffer = Buffer.from(reader.result);
    ipfs.add(buffer).then(res=>{
      //console.log(res[0].hash);
      resolve(res[0].hash);
    }).catch(err=>{
      console.error(err);
      reject(err);
    });
  });
}

async function uploadDataSetToBlockchain(params, dataLink){
  console.log("Upload to blockchain params: ", params);
  await App.instance.uploadData(params['dataset-name'], params['dataset-desc'], dataLink, {from: App.account});

  console.log('Transaction complete!');
  autoJumpAfterWaiting();
  /*DataShare.deployed().then(x=>{
    x.uploadData(params['dataset-name'], params['dataset-desc'], dataLink, {from: App.account}).then($('#msg').show());
  });*/
}

function autoJumpAfterWaiting(){
  //上传结束3s后跳转至详情页
  setTimeout(function(){
    var time = 2;
    $('#msg').show();
    var timer = setInterval(function(){
      if(time == 0){
        clearInterval(timer);
        document.getElementById("msg").innerHTML = '正在跳转...';
        window.location.href = "detail.html?id=" + (App.maxIndex + 1);
      }
      else{
        document.getElementById("msg").innerHTML = '上传成功！' + time + 's后跳转至详情页...';
        time--;
      }
    }, 1000);
  });
}

function downloadFromIpfs(hash){
  //console.log('shot');
  //根据请求的链接返回的blob下载文件
  var x = new XMLHttpRequest();
  x.open('GET', "http://localhost:8080/ipfs/" + hash, true);
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
  
  //刷新下载次数
  $('#res-downloads').html((i, origText)=>{
    return (Number(origText.substr(0, origText.length - 3)) + 1).toString() + "次下载";
  });
}

function jumpToDetail(){
  const searchId = $('#search-id').val();
  if(!/^\d+$/.test(searchId)){
    window.alert('格式错误，请输入数字');
    return;
  }

  if(Number(searchId) > App.maxIndex){
    window.alert('该数据集（ID：' + searchId + '）不存在');
  }
  else{
    window.location.href = "detail.html?id=" + searchId;
  }
}

function renderDetailPage(id){
  DataShare.deployed().then(x=>{
    x.getDataSet(id).then(res=>{
      $('#res-id').html(id);
      $('#res-name').html(res[0]);
      $('#res-desc').html(res[1]);
      $('#res-uper').html(res[2]);
      $('#res-downloads').html(res[4] + '次下载');
      $('#res-time').html(timestampToDate(res[5].toString()));
      /* 下载数据集按钮点击事件 */
      $('#download-btn').click(async function(){
        let res = await App.instance.getDataSet(id);
        downloadFromIpfs(res[3]);
      });
      $('#dataset-detail').show();
    });
  });
}

function timestampToDate(time){
  return new Date(parseInt(time) * 1000).toLocaleString().replace(/:\d{1,2}$/,' ');;
}

function renderDataList(){
  var pagesCount = Math.ceil(App.maxIndex / 12);
  var curPage = 1;

  generatePagination(pagesCount);
  // 初次加载
  for(var i = 0; i < 12; i++){
    if(App.maxIndex > (curPage - 1)*12 + i){
      App.instance.getDataSet(App.maxIndex - i).then(res=>{
        $('#data-list').append(buildDataItem(res));
      });
    }
  }

  $('.custom-pagination li a').click(function(){
    var idx;
    if($(this).hasClass('prev-page')){
      curPage--;
      idx = $('.custom-pagination li a.active').parent().index('.custom-pagination li') - 1;
      adjustPagination($('.custom-pagination li:eq('+ idx +') a'), pagesCount);
    }
    else if($(this).hasClass('next-page')){
      curPage++;
      idx = $('.custom-pagination li a.active').parent().index('.custom-pagination li') + 1;
      adjustPagination($('.custom-pagination li:eq('+ idx +') a'), pagesCount);
    }
    else if($(this).hasClass('active')){
      return;
    }
    else{
      curPage = Number($(this).html());
      adjustPagination($(this), pagesCount);
    }
    changeItemContent(curPage);
  });
}

function changeItemContent(curPage){
  for(var i = 0; i < 12; i++){
    if(App.maxIndex > (curPage - 1)*12 + i){
      let item = $('.data-item-content').eq(i);
      let content = item.children();
      App.instance.getDataSet(App.maxIndex - (curPage - 1)*12 - i).then(res=>{
        $(content[0]).html(res[0]);
        $(content[1]).html(res[2]);
        $(content[2]).html(timestampToDate(res[5].toString()));
        $(content[3]).html(res[4] + '次下载');
        $(content[4]).html(res[1]);
        $(content[5]).attr('onclick', '').unbind('click').click(function(){downloadFromIpfs(res[3])});
        item.parent().show();
      });
    }
    else{
      $('.data-item-content').eq(i).parent().hide();
    }
  }
}

function buildDataItem(dataInfo){
  let item = $('<div class="col-12 col-sm-12 col-md-6 col-lg-6 px-2 mb-4 mb-lg-3 aos-init" \
  data-aos="fade-up"></div>');
  let content = $('<div class="data-item-content"></div>');
  content.append('<h4 id="item-name">' + dataInfo[0] + '</h4>');
  content.append('<p class="text-muted" id="item-uper">' + dataInfo[2] + '</p>');
  content.append('<small class="text-muted" id="item-time">于 ' + timestampToDate(dataInfo[5].toString()) + '上传</small>')
  content.append('<small class="text-muted" id="item-downloads"> | ' + dataInfo[4] + '次下载</small>');
  content.append('<p id="item-desc">' + dataInfo[1] + '</p>');
  let btn = $('<button class="btn btn-primary" id="item-btn" type="button">下载</button>');
  btn.click(function(){downloadFromIpfs(dataInfo[3])});
  content.append(btn);
  item.append(content);
  return item;
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

