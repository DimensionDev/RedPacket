const BigNumber = require('bignumber.js');

let TestToken = artifacts.require('TestToken_721');

module.exports = function(deployer){
    deployer.deploy(TestToken, 151);
};
