import { default as Web3 } from "web3";
import { default as contract } from "truffle-contract";
import dataShareArtifacts from "../../build/contracts/DataShare.json";

var DataShare = contract(dataShareArtifacts);

const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI({host: 'localhost', port: '5001', protocol: 'http'});

window.App = {
  start: function(){
    var self = this;
    DataShare.setProvider(web3.currentProvider);

    /*将文件读取到缓冲区 */
    var reader;
    $('#dataset-file').change(event=>{
      const file = event.target.files[0];
      reader = new window.FileReader();
      reader.readAsArrayBuffer(file);
    });
    
    /*提交数据集信息表单 */
    $('#dataset-info').submit(event=>{
      const req = $('#dataset-info').serialize();
      //console.log("serialize: ", req);
      let params = JSON.parse('{"' + req.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
      //console.log("params: ", params);

      let decodeParams = {};
      Object.keys(params).forEach(key=>{
        decodeParams[key] = decodeURIComponent(decodeURI(params[key]));
      });

      let dataLink;
      uploadDataOnIpfs(reader).then(link=>{
        dataLink = link;
        uploadDataSetToBlockchain(decodeParams, dataLink);
      });

      return false;
    });

    /*根据id搜索数据集 */
    $('#search-box').submit(event=>{
      const searchId = $('#input-id').val();
      DataShare.deployed().then(x=>{
        x.getDataSet(searchId).then(res=>{
          if(searchId == ""){
            return false;
          }
          if(res[6].toString() != 1){
            window.alert('该数据集（ID：' + searchId + '）不存在');
          }
          else{
            //console.log(res[6].toString());
            $('#res-id').html(searchId);
            $('#res-name').html(res[0]);
            $('#res-desc').html(res[1]);
            $('#res-uper').html(res[2]);
            $('#res-downloads').html(res[4] + '次下载');
            $('#res-time').html(timestampToDate(res[5].toString()));
            $('#dataset-detail').show();
          }
        });
      });

      return false;
    });

    $('#download-btn').click(function(){
      const id = $("#download-btn").parent().prev()[0].textContent;
      //console.log(id);
      DataShare.deployed().then(x=>{
        x.getDataSet(id).then(res=>{
          downloadFromIpfs(res[3]);
        });
      });
    });
  }
}

window.addEventListener('load', function(){
  if(typeof web3 !== undefined){
    window.web3 = new Web3(web3.currentProvider);
  }
  else{
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));
  }

  App.start();
});

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

function uploadDataSetToBlockchain(params, dataLink){
  console.log("Upload to blockchain params: ", params);
  DataShare.deployed().then(async (x)=>{
    let accounts = await web3.eth.getAccounts();
    //console.log(accounts[0]);
    x.uploadData(params['dataset-name'], params['dataset-desc'], dataLink, {from: accounts[0]}).then(res=>{
      $('#msg').show();
    });
  });
}

function timestampToDate(time){
  return new Date(parseInt(time) * 1000).toLocaleString().replace(/:\d{1,2}$/,' ');;
}


function downloadFromIpfs(hash){
  var a = document.createElement('a');
  a.download = hash;
  a.href = "http://localhost:8080/ipfs/" + hash;
  $("body").append(a);
  a.click();
  $(a).remove();
  //刷新下载次数
  $('#res-downloads').html((i, origText)=>{
    return (Number(origText.substr(0, origText.length - 3)) + 1).toString() + "次下载";
  });
}
