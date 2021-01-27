const BigNumber = require('bignumber.js');

let TestToken = artifacts.require('TestToken');

module.exports = function(deployer){
    const amount = new BigNumber('1e27').toFixed();
    deployer.deploy(TestToken, amount);
};
