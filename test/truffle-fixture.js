const BigNumber = require('bignumber.js');

const TestToken  = artifacts.require('TestToken');
const Redpacket = artifacts.require('HappyRedPacket');

module.exports = async () => {

    const amount = new BigNumber('1e27').toFixed();
    const test_token = await TestToken.new(amount)
    TestToken.setAsDeployed(test_token);

    const redpacket = await Redpacket.new()
    Redpacket.setAsDeployed(redpacket);
};