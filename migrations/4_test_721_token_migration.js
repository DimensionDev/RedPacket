let Test721Token = artifacts.require('Test721Token');

module.exports = function(deployer){
  deployer.deploy(Test721Token, 20);
};
