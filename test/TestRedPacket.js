const BigNumber = require('bignumber.js')
const Web3 = require('web3')
const chai = require('chai')
const expect = chai.expect
chai.use(require('chai-as-promised'))
const helper = require('./helper')
const {
    creation_success_encode,
    creation_success_types,
    claim_success_encode,
    claim_success_types,
    refund_success_encode,
    refund_success_types,
    public_key,
    private_key,
    eth_address,
} = require('./constants')

const TestToken = artifacts.require('TestToken');
const HappyRedPacket = artifacts.require('HappyRedPacket')

contract('HappyRedPacket', accounts => {
  let snapShot
  let snapshotId
  let testtoken
  let redpacket
  let creationParams

  before(async () => {
    snapShot = await helper.takeSnapshot()
    snapshotId = snapShot['result']
    testtoken = await TestToken.deployed()
    redpacket = await HappyRedPacket.deployed()
  })

  beforeEach(async () => {
    creationParams = {
      hash: public_key,
      number: 3,
      ifrandom: true,
      duration: 1000,
      seed: web3.utils.sha3('lajsdklfjaskldfhaikl'),
      message: 'Hi',
      name: 'cache',
      token_type: 0,
      token_addr: eth_address,
      total_tokens: 100000000,
    }
    console.log(public_key);
  })

  afterEach(async () => {
    await helper.revertToSnapShot(snapshotId)
  })

  describe('create_red_packet()', async () => {
    it('should throw error when expiration_time is greater than 2106', async () => {
      creationParams.duration = 2 ** 32
      await expect(
        redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
          value: creationParams.total_tokens,
        }),
      ).to.be.rejectedWith(Error)
    })

    it('should throw error when token_type is unrecognizable', async () => {
      creationParams.token_type = 4
      await expect(
        redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
          value: creationParams.total_tokens,
        }),
      ).to.be.rejectedWith(getRevertMsg('Unrecognizable token type'))
    })
  
    it('should throw error when total_tokens is less than number', async () => {
      creationParams.number = 11
      creationParams.total_tokens = 10
      await expect(
        redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
          value: creationParams.total_tokens,
        }),
      ).to.be.rejectedWith(Error)
    })
  
    it('should throw error when number is less than 1', async () => {
      creationParams.number = 0
        await expect(
          redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
            from: accounts[0],
            value: creationParams.total_tokens,
          }),
        ).to.be.rejectedWith(getRevertMsg('At least 1 recipient'))
    })

    it('should throw error when number is greater than 255', async () => {
      creationParams.number = 256
      await expect(
        redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
          value: creationParams.total_tokens,
        }),
      ).to.be.rejectedWith(getRevertMsg('At most 255 recipients'))
    })

    it('should throw error when eth is not enough', async () => {
      await expect(
        redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
          value: creationParams.total_tokens - 1,
        }),
      ).to.be.rejectedWith(getRevertMsg('No enough ETH'))
    })

    it('should throw error when erc20 token is not enough allowance', async () => {
      creationParams.token_type = 1
      creationParams.token_addr = testtoken.address
      await testtoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens - 1)
      await expect(
        redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('No enough allowance'))
    })

    it('should emit CreationSuccess when everything is ok', async () => {
      await redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
        from: accounts[0],
        value: creationParams.total_tokens,
      })

      const result = await getRedPacketInfo()
      expect(result)
        .to.have.property('total')
        .that.to.be.eq(creationParams.total_tokens.toString())
      expect(result).to.have.property('id').that.to.be.not.null
      expect(result)
        .to.have.property('name')
        .that.to.be.eq(creationParams.name)
      expect(result)
        .to.have.property('message')
        .that.to.be.eq(creationParams.message)
      expect(result)
        .to.have.property('creator')
        .that.to.be.eq(accounts[0])
      expect(result)
        .to.have.property('creation_time')
        .that.to.length(10)
    })
  })

  describe('claim()', async () => {
    it('should emit ClaimSuccess when everything is ok', async () => {
      const { claimParams } = await createThenGetClaimParams(accounts[1])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const claimResults = await getClaimRedPacketInfo(0)
      expect(claimResults[0]).to.have.property('id').that.to.be.not.null
      console.log(claimResults);
    })
  })


  async function getRedPacketInfo() {
    const logs = await web3.eth.getPastLogs({
      address: redpacket.address,
      topic: [web3.utils.sha3(creation_success_encode)],
    })
    return web3.eth.abi.decodeParameters(creation_success_types, logs[0].data)
  }

  function getRevertMsg(msg) {
    return `Returned error: VM Exception while processing transaction: revert ${msg} -- Reason given: ${msg}.`
  }

  async function createThenGetClaimParams(account) {
    await createRedPacket()
    const redPacketInfo = await getRedPacketInfo()
    return { claimParams: createClaimParams(redPacketInfo.id, account), redPacketInfo }
  }

  async function createRedPacket() {
    await redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
      from: accounts[0],
      value: creationParams.total_tokens,
    })
  }

  async function getClaimRedPacketInfo(fromBlock = 1) {
    const latestBlock = await web3.eth.getBlockNumber()
    const logs = await web3.eth.getPastLogs({
      address: redpacket.address,
      topic: [web3.utils.sha3(claim_success_encode)],
      fromBlock: latestBlock - fromBlock,
      toBlock: latestBlock,
    })
    return logs.map(log => web3.eth.abi.decodeParameters(claim_success_types, log.data))
  }

  function createClaimParams(id, recipient) {
    // accounts[1] is the msg.sender of transaction which calls claim()
    var signedMsg = web3.eth.accounts.sign(accounts[1], private_key).signature
    var signedMsg_to_str = web3.utils.hexToAscii(signedMsg);
    return {
      id,
      password: signedMsg_to_str,
      recipient,
      validation: web3.utils.sha3(recipient),
    }
  }
})