const BigNumber = require('bignumber.js');

const TestToken  = artifacts.require('TestToken');
const BurnToken  = artifacts.require('BurnToken');
const Redpacket = artifacts.require('HappyRedPacket');

module.exports = async () => {

    const amount = new BigNumber('1e27').toFixed();
    const test_token = await TestToken.new(amount);
    TestToken.setAsDeployed(test_token);

    const burn_token = await BurnToken.new(amount);
    BurnToken.setAsDeployed(burn_token);

    const redpacket = await Redpacket.new()
    Redpacket.setAsDeployed(redpacket);
};