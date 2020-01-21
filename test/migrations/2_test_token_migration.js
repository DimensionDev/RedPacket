let TestToken = artifacts.require('TestToken');

module.exports = function(deployer){
    deployer.deploy(TestToken, 1000000);
};
