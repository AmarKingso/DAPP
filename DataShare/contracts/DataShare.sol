// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21;

contract DataShare{
    enum DataSetStatus { invalid, valid }

    uint dataSetIndex;
    mapping(uint => DataSet) dataSetCollection;       //id到数据的映射
    mapping(address => uint[]) uperAllUpload;  //上传者 => 其上传的所有数据集id
    mapping(address => mapping(uint => bool)) hasDownloaded;    //用户是否下载了当前数据
    mapping(address => uint[]) userDownload;    //存储用户下载的所有数据
    mapping(address => UserInfo) users;      //用户列表

    struct DataSet{
        uint id;
        string name;
        string category;        //分类
        string description;     //描述
        string uper;            //上传者名字
        string dataLink;        //数据集的链接
        uint downloads;         //下载量
        uint uploadTime;        //上传时间
        DataSetStatus status;   //数据集状态
    }

    struct UserInfo{
        string name;
        uint point;
        bool hasExist;
    }

    constructor(){
        dataSetIndex = 0;
    }

    /**
      * 为区块链账户设置一个User 
      * 参数：账户名字
      */
    function setUser(string memory _name) public{
        UserInfo memory user = UserInfo(_name, 0, true);
        users[msg.sender] = user;
    }

    /** 
      * 得到个人信息 
      * 返回值：账户名字，账户积分，账户有效性
      */
    function getSelfInfo() public view returns (string memory, uint, bool){
        return (users[msg.sender].name, users[msg.sender].point, users[msg.sender].hasExist);
    }

    /**
      * 上传数据信息
      * 参数：数据名，数据分类，数据描述，数据文件hash，上传该文件所加积分点
      */
    function uploadData(string memory _name, string memory _category, string memory _description, string memory _dataLink, uint _point) public{
        dataSetIndex++;
        DataSet memory dataset = DataSet(dataSetIndex, _name, _category, _description, users[msg.sender].name, _dataLink, 0, block.timestamp, DataSetStatus.valid);
        dataSetCollection[dataSetIndex] = dataset;
        uperAllUpload[msg.sender].push(dataSetIndex);
        users[msg.sender].point += _point;
    }
    
    /* 检查当前用户是否下载过该id的数据 */
    function checkHasDownload(uint _dataSetId) public view returns (bool){
        return hasDownloaded[msg.sender][_dataSetId];
    }

    /**
      * 增加数据下载量，并将数据id添加到用户的下载库中
      * 参数：所下载数据的id
      */
    function addDownloads(uint _dataSetId) public{
        dataSetCollection[_dataSetId].downloads++;
        hasDownloaded[msg.sender][_dataSetId] = true;
        userDownload[msg.sender].push(_dataSetId);
    }
    
    /**
      * 获得数据信息
      * 参数：所要查看的数据id
      * 返回值：数据名字，数据分类，数据上传者，数据文件hash，下载量，上传时间，当前数据状态
      */
    function getDataSet(uint _dataSetId) public view returns (string memory, string memory, string memory, string memory, string memory, uint, uint, DataSetStatus){
        DataSet memory dataset = dataSetCollection[_dataSetId];
        return (dataset.name, dataset.category, dataset.description, dataset.uper, dataset.dataLink, dataset.downloads, dataset.uploadTime, dataset.status);
    }

    /* 返回当前链上的文件数量 */
    function getIndex() public view returns (uint){
        return dataSetIndex;
    }
    
    /* 获得当前用户上传的全部数据的id */
    function getUserAllUploadId() public view returns (uint[] memory){
        return uperAllUpload[msg.sender];
    }
    
    /* 获得当前用户下载的全部数据的id */
    function getUserAllDownloadId() public view returns (uint[] memory){
        return userDownload[msg.sender];
    }
    
    /* 下架数据 */
    function dropData(uint _dataSetId) public{
        dataSetCollection[_dataSetId].status = DataSetStatus.invalid;
    }
}
