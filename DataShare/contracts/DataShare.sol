// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21 <0.8.0;

contract DataShare{
    enum DataSetStatus { invalid, valid }

    uint dataSetIndex;
    mapping(uint => address) datasetIdToUper;       //数据集id => 该数据集的上传者
    mapping(address => mapping(uint => DataSet)) uperToAllDataSet;  //上传者 => 其上传的所有数据集
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

    constructor() public{
        dataSetIndex = 0;
    }

    function setUser(string memory _name) public{
        UserInfo memory user = UserInfo(_name, 0, true);
        users[msg.sender] = user;
    }

    function getSelfInfo(address addr) public view returns (string memory, uint, bool){
        return (users[addr].name, users[addr].point, users[addr].hasExist);
    }

    function uploadData(string memory _name, string memory _category, string memory _description, string memory _dataLink, uint _point) public{
        dataSetIndex++;
        DataSet memory dataset = DataSet(dataSetIndex, _name, _category, _description, users[msg.sender].name, _dataLink, 0, block.timestamp, DataSetStatus.valid);
        datasetIdToUper[dataSetIndex] = msg.sender;
        uperToAllDataSet[msg.sender][dataSetIndex] = dataset;
        users[msg.sender].point += _point;
    }

    function addDownloads(uint _dataSetId) public{
        uperToAllDataSet[datasetIdToUper[_dataSetId]][_dataSetId].downloads++;
    }
    
    function getDataSet(uint _dataSetId) public view returns (string memory, string memory, string memory, string memory, string memory, uint, uint, DataSetStatus){
        DataSet memory dataset = uperToAllDataSet[datasetIdToUper[_dataSetId]][_dataSetId];
        return (dataset.name, dataset.category, dataset.description, dataset.uper, dataset.dataLink, dataset.downloads, dataset.uploadTime, dataset.status);
    }

    function getIndex() public view returns (uint){
        return dataSetIndex;
    }
}
