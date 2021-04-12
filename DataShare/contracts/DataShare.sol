// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21;

contract DataShare{
    enum Relation { independent, downloaded, evaluated, owner }     //分别为：未下载，已下载，已评价，数据拥有者

    uint dataSetIndex;
    mapping(uint => DataSet) dataSetCollection;       //id到数据的映射
    mapping(address => uint[]) uperAllUpload;  //上传者 => 其上传的所有数据集id
    mapping(address => mapping(uint => Relation)) dataStatus;    //用户是否下载了当前数据
    mapping(address => uint[]) userDownload;    //存储用户下载的所有数据
    mapping(address => UserInfo) users;      //用户列表
    mapping(string => uint[]) dataByCategory;       //根据分类划分数据

    struct DataSet{
        uint id;
        address addr;
        string name;
        string category;        //分类
        string description;     //描述
        string uper;            //上传者名字
        string dataLink;        //数据集的链接
        uint downloads;         //下载量
        uint uploadTime;        //上传时间
        uint favorable;         //点赞量
        uint evaluationCount;   //评价总数
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
        if(users[msg.sender].hasExist){
            users[msg.sender].name = _name;
        }
        else{
            users[msg.sender] = UserInfo(_name, 0, true);
        }
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
        DataSet memory dataset = DataSet(dataSetIndex, msg.sender, _name, _category, _description, users[msg.sender].name, _dataLink, 0, block.timestamp, 0, 0);
        dataSetCollection[dataSetIndex] = dataset;
        dataByCategory[_category].push(dataSetIndex);
        uperAllUpload[msg.sender].push(dataSetIndex);
        dataStatus[msg.sender][dataSetIndex] = Relation.owner;
        users[msg.sender].point += _point;
    }
    
    /* 检查当前用户与检索数据的关系 */
    function checkHasDownload(uint _dataSetId) public view returns (Relation){
        return dataStatus[msg.sender][_dataSetId];
    }

    /**
      * 增加数据下载量，并将数据id添加到用户的下载库中
      * 参数：所下载数据的id，本次下载给上传者增加的积分
      */
    function addDownloads(uint _dataSetId, uint _point) public{
        if(checkHasDownload(_dataSetId) != Relation.independent){
            return;
        }
        dataSetCollection[_dataSetId].downloads++;
        dataStatus[msg.sender][_dataSetId] = Relation.downloaded;
        userDownload[msg.sender].push(_dataSetId);
        users[dataSetCollection[_dataSetId].addr].point += _point;
    }
    
    /**
      * 获得数据信息
      * 参数：所要查看的数据id
      * 返回值：数据名字，数据分类，数据上传者，数据文件hash，下载量，上传时间，当前数据状态，点赞量，评价数
      */
    function getDataSet(uint _dataSetId) public view returns (string memory, string memory, string memory, string memory, string memory, uint, uint, uint, uint){
        DataSet memory dataset = dataSetCollection[_dataSetId];
        if(checkHasDownload(_dataSetId) != Relation.independent){
            return (dataset.name, dataset.category, dataset.description, dataset.uper, dataset.dataLink, dataset.downloads, dataset.uploadTime, dataset.favorable, dataset.evaluationCount);
        }
        else{
            return (dataset.name, dataset.category, dataset.description, dataset.uper, "unknown", dataset.downloads, dataset.uploadTime, dataset.favorable, dataset.evaluationCount);
        }
    }
    
    /* 返回数据名字，用于模糊搜索 */
    function getDataName(uint _dataSetId) public view returns (string memory){
        return dataSetCollection[_dataSetId].name;
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
    
    /* 返回该类别下的全部数据id */
    function getDataIdByCategory(string memory _category) public view returns (uint[] memory){
        return dataByCategory[_category];
    }
    
    /* 根据用户评价更改数据集评价 */
    function setEvaluation(uint _dataSetId, bool isGood) public{
        if(checkHasDownload(_dataSetId) != Relation.downloaded){
            return;
        }
        if(isGood){
            dataSetCollection[_dataSetId].favorable++;
        }
        dataSetCollection[_dataSetId].evaluationCount++;
        dataStatus[msg.sender][_dataSetId] = Relation.evaluated;
    }
}
