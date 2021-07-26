const BigNumber = require('bignumber.js');
const TestToken_721 = artifacts.require('TestToken_721');
const RedPacket_721 = artifacts.require('HappyRedPacket_ERC721');

const TestToken  = artifacts.require('TestToken');
const Redpacket = artifacts.require('HappyRedPacket');

module.exports = async () => {
    const test_token_721 = await TestToken_721.new(200)
    TestToken_721.setAsDeployed(test_token_721);

    const redpacket_721 = await RedPacket_721.new()
    RedPacket_721.setAsDeployed(redpacket_721);

    // const amount = new BigNumber('1e27').toFixed();
    // const test_token = await TestToken.new(amount)
    // TestToken.setAsDeployed(test_token);

    // const redpacket = await Redpacket.new()
    // Redpacket.setAsDeployed(redpacket);
};
