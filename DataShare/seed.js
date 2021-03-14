DataShare = artifacts.require('./DataShare.sol')


module.exports = function(){
    DataShare.deployed().then(x => {x.uploadData('html', 'about html msg').then(i => {console.log(i)})});
    DataShare.deployed().then(x => {x.uploadData('css', 'about css msg').then(i => {console.log(i)})});
    DataShare.deployed().then(x => {x.uploadData('js', 'about js msg').then(i => {console.log(i)})});
    DataShare.deployed().then(x => {x.uploadData('solidity', 'about solidity msg').then(i => {console.log(i)})});
}
