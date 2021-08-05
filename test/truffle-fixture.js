const TestToken_721 = artifacts.require('TestToken_721')
const RedPacket_721 = artifacts.require('HappyRedPacket_ERC721')

module.exports = async () => {
  const test_token_721 = await TestToken_721.new(250)
  TestToken_721.setAsDeployed(test_token_721)

  const redpacket_721 = await RedPacket_721.new()
  RedPacket_721.setAsDeployed(redpacket_721)
}
