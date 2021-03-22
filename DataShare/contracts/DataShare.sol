// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21 <0.8.0;

contract DataShare{
    enum DataSetStatus { invalid, valid }

    uint dataSetIndex;
    mapping(uint => address) datasetIdToUper;       //数据集id => 该数据集的上传者
    mapping(address => mapping(uint => DataSet)) uperToAllDataSet;  //上传者 => 其上传的所有数据集

    struct DataSet{
        uint id;
        string name;
        string description;     //数据集描述
        address uper;
        string dataLink;        //数据集的链接
        uint downloads;         //下载量
        uint uploadTime;        //上传时间
        DataSetStatus status;   //数据集状态
    }

    constructor() public{
        dataSetIndex = 0;
    }

    function uploadData(string memory _name, string memory _description, string memory _dataLink) public{
        dataSetIndex++;
        DataSet memory dataset = DataSet(dataSetIndex, _name, _description, msg.sender, _dataLink, 0, block.timestamp, DataSetStatus.valid);
        datasetIdToUper[dataSetIndex] = msg.sender;
        uperToAllDataSet[msg.sender][dataSetIndex] = dataset;
    }

    function getDataSet(uint _dataSetId) public view returns (string memory, string memory, address, string memory, uint, uint, DataSetStatus){
        DataSet memory dataset = uperToAllDataSet[datasetIdToUper[_dataSetId]][_dataSetId];
        return (dataset.name, dataset.description, dataset.uper, dataset.dataLink, dataset.downloads, dataset.uploadTime, dataset.status);
    }

    function getIndex() public view returns (uint){
        return dataSetIndex;
    }
}
