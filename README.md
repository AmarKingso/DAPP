# DataShare

## 初次运行

### 所需环境、工具
将项目clone到本地后，首先确保系统中安装了geth，npm，solc，truffle，ipfs，浏览器安装了MetaMask插件。

安装指令如下
```bash
# 安装geth
sudo apt-get install software-properties-common
sudo add-apt-repository -y ppa:ethereum/ethereum
sudo apt-get update
sudo apt-get install ethereum

# 安装npm
sudo apt-get install npm
# 更新npm镜像源
sudo npm config set registry https://registry.npm.taobao.org

# 安装solidity编译环境
sudo npm install -g solc

# 安装truffle
sudo npm install -g truffle

# 访问https://dist.ipfs.io/#go-ipfs，找到相应操作系统版本进行下载，而后解压
tar xzvf go-ipfs_v0.8.0_linux-amd64.tar.gz
cd go-ipfs
./ipfs init
./ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
# 修改端口，之后网站要运行在8080端口
ipfs config Addresses.Gateway /ip4/127.0.0.1/tcp/8081
```

### 节点生成
之后的步骤默认已经有一个主链，主链中至少有一个授权节点，如果还没有主链，请参考我的另一篇博客：(基于以太坊的联盟链搭建——同域下两台主机节点的互通)[https://amarkingso.gitee.io/2021/03/26/building-consortium-blockchain/] 。

而后根据生成主链的genesis.json文件生成区块链，步骤如下：
```bash
# 创建一个账户，并将账户数据存放在node文件夹下
# 执行后输入自己方便记忆的密码，生成的账户公钥会在终端显示。
geth --datadir node account new

# 初始化区块链
geth --datadir node init genesis.json

# 启动区块链，unlock后参数为此前创建的账户公钥，执行后输入账户密码即可进入区块链控制台
geth --datadir node --rpc --port 30304 --rpcport 8546 --rpccorsdomain "*" --rpcapi "eth,net,web3,admin,personal,miner" --networkid 2021 --nodiscover --unlock 'cDEa18962A2c7e921305439Eecbfc5D0C08D3140' --allow-insecure-unlock console
```

需要注意的是，上面启动区块链的指令，采用了nodiscover模式，即不主动寻找其他节点进行连接。如果要与其他节点通信，可通过以下三种方式：
1. 去掉启动指令中的--nodiscover。
2. 启动区块链后，通过 ```admin.addPeer(enode)``` 指令添加其他节点。其中参数enode是欲连接的节点的enode，通过 ```admin.nodeInfo.enode``` 指令获取。
3. 在存储区块链数据的文件下（这里是node），添加一个static-nodes.json文件，其中添加所要连接节点的enode，保存后重启区块链。

> 注：enode后的ip要改成对应主机的ip。进行连接操作后，可以通过 ```admin.peers```指令查看是否连接到目标节点。

### 启动项目
1. 进入项目根目录下，即含有truffle-config.json文件的目录下，打开终端，输入 ```truffle migrate```，同时启动授权节点挖矿，等待部署完成。部署完成后，其他连接的节点会自动同步。
2. 进入此前下载的ipfs文件夹下，执行 ```./ipfs daemon``` 启动ipfs本地服务器（如果不需要上传下载服务可不启动）。
3. 进入app文件夹下（即package.json所在目录），执行 ```npm run dev```，等待编译完成。
4. 打开浏览器，配置MetaMask，具体参考(基于以太坊的联盟链搭建——同域下两台主机节点的互通)[https://amarkingso.gitee.io/2021/03/26/building-consortium-blockchain/] 的4.3节。
5. 访问http://localhost:8080 。

## 重复启动项目
1. 启动区块链（公钥记得替换）：
```bash
geth --datadir node --rpc --port 30304 --rpcport 8546 --rpccorsdomain "*" --rpcapi "eth,net,web3,admin,personal,miner" --networkid 2021 --nodiscover --unlock 'cDEa18962A2c7e921305439Eecbfc5D0C08D3140' --allow-insecure-unlock console
```
2. 进入ipfs文件夹，执行 ```./ipfs daemon```（如果不需要上传下载服务可不启动）。
3. 进入app文件夹下（即package.json所在目录），执行 ```npm run dev```。
4. 打开浏览器，访问http://localhost:8080 。
