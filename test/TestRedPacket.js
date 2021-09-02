const BigNumber = require('bignumber.js')
// const Web3 = require('web3')
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
const BurnToken = artifacts.require('BurnToken');
const HappyRedPacket = artifacts.require('HappyRedPacket')

contract('HappyRedPacket', accounts => {
  let snapShot
  let snapshotId
  let testtoken
  let burntoken
  let redpacket
  let creationParams

  before(async () => {
    snapShot = await helper.takeSnapshot()
    snapshotId = snapShot['result']
    testtoken = await TestToken.deployed()
    burntoken = await BurnToken.deployed()
    redpacket = await HappyRedPacket.deployed()
  })

  beforeEach(async () => {
    creationParams = {
      public_key: public_key,
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
  })

  afterEach(async () => {
    await helper.revertToSnapShot(snapshotId)
  })

  describe('create_red_packet() test', async () => {
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

    it('should throw error when received tokens is less than number', async () => {
      creationParams.token_type = 1
      creationParams.number = 10
      creationParams.total_tokens = 10
      creationParams.token_addr = burntoken.address
      await burntoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens, { from: accounts[0] })

      await expect(
        redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
          value: creationParams.total_tokens,
        }),
      ).to.be.rejectedWith("#received > #packets")

      creationParams.number = 4
      creationParams.total_tokens = 6
      await expect(
        redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
          value: creationParams.total_tokens,
        }),
      ).to.be.rejectedWith("#received > #packets")
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
      ).to.be.rejectedWith(getRevertMsg('ERC20: transfer amount exceeds allowance'))
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

  describe('check_availability() test', async () => {
    it('should throw error when red packet does not exist', async () => {
      await expect(redpacket.check_availability.call('id not exist', { from: accounts[1] })).to.be.rejectedWith(Error)
    })

    it('should return availability status when everything is ok', async () => {
      await createRedPacket()
      const redPacketInfo = await getRedPacketInfo()
      const availability = await redpacket.check_availability.call(redPacketInfo.id, { from: accounts[1] })
      expect(availability).to.be.an('object')
      expect(BigNumber(availability.claimed_amount).toFixed()).to.be.eq('0')
    })

    it('should return red packet info after expired', async () => {
      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const claimResults = await getClaimRedPacketInfo(0)
      const claimed_tokens = claimResults[0].claimed_value
      const remain = 100000000 - Number(claimed_tokens)

      await helper.advanceTimeAndBlock(2000)

      const availability = await redpacket.check_availability.call(redPacketInfo.id, { from: accounts[1] })
      expect(availability).to.be.an('object')
      expect(BigNumber(availability.claimed).toFixed()).to.be.eq('1')
      expect(availability.token_address).to.be.eq('0x0000000000000000000000000000000000000000')
      expect(BigNumber(availability.total).toFixed()).to.be.eq('3')
      expect(BigNumber(availability.claimed_amount).toFixed()).to.be.eq(claimed_tokens)
      expect(Number(availability.balance)).to.be.eq(remain)
      expect(availability.expired).to.be.eq(true)
    })

    it('should return red packet info after expired (erc20)', async () => {
      creationParams.token_type = 1
      creationParams.token_addr = testtoken.address

      // create red packet
      await testtoken.transfer(accounts[0], creationParams.total_tokens + 1)
      await testtoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens, { from: accounts[0] })
      await redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
        from: accounts[0],
      })
      const redPacketInfo = await getRedPacketInfo()
      var signedMsg = web3.eth.accounts.sign(accounts[1], private_key).signature
      claimParams = {
        id : redPacketInfo.id,
        signedMsg,
        recipient: accounts[1],
      }
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const claimResults = await getClaimRedPacketInfo(0)
      const claimed_tokens = claimResults[0].claimed_value
      const remain = 100000000 - Number(claimed_tokens)

      await helper.advanceTimeAndBlock(2000)

      const availability = await redpacket.check_availability.call(redPacketInfo.id, { from: accounts[1] })
      expect(availability).to.be.an('object')
      expect(BigNumber(availability.claimed).toFixed()).to.be.eq('1')
      expect(availability.token_address).to.be.eq(testtoken.address)
      expect(BigNumber(availability.total).toFixed()).to.be.eq('3')
      expect(BigNumber(availability.claimed_amount).toFixed()).to.be.eq(claimed_tokens)
      expect(Number(availability.balance)).to.be.eq(remain)
      expect(availability.expired).to.be.eq(true)
    })

    it('should return red packet info after refund', async () => {
      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const claimResults = await getClaimRedPacketInfo(0)
      const claimed_tokens = claimResults[0].claimed_value

      await helper.advanceTimeAndBlock(2000)

      await redpacket.refund.sendTransaction(redPacketInfo.id, {
        from: accounts[0],
      })

      const availability = await redpacket.check_availability.call(redPacketInfo.id, { from: accounts[1] })
      expect(availability).to.be.an('object')
      expect(BigNumber(availability.claimed).toFixed()).to.be.eq('1')
      expect(availability.token_address).to.be.eq('0x0000000000000000000000000000000000000000')
      expect(BigNumber(availability.total).toFixed()).to.be.eq('3')
      expect(BigNumber(availability.balance).toFixed()).to.be.eq('0')
      expect(BigNumber(availability.claimed_amount).toFixed()).to.be.eq(claimed_tokens)
      expect(availability.expired).to.be.eq(true)
    })

    it('should return red packet info after refund (erc20)', async () => {
      creationParams.token_type = 1
      creationParams.token_addr = testtoken.address

      // create red packet
      await testtoken.transfer(accounts[0], creationParams.total_tokens + 1)
      await testtoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens, { from: accounts[0] })
      await redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
        from: accounts[0],
      })
      const redPacketInfo = await getRedPacketInfo()
      var signedMsg = web3.eth.accounts.sign(accounts[1], private_key).signature
      claimParams = {
        id : redPacketInfo.id,
        signedMsg,
        recipient: accounts[1],
      }
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const claimResults = await getClaimRedPacketInfo(0)
      const claimed_tokens = claimResults[0].claimed_value

      await helper.advanceTimeAndBlock(2000)

      await redpacket.refund.sendTransaction(redPacketInfo.id, {
        from: accounts[0],
      })

      const availability = await redpacket.check_availability.call(redPacketInfo.id, { from: accounts[1] })
      expect(availability).to.be.an('object')
      expect(BigNumber(availability.claimed).toFixed()).to.be.eq('1')
      expect(availability.token_address).to.be.eq(testtoken.address)
      expect(BigNumber(availability.total).toFixed()).to.be.eq('3')
      expect(BigNumber(availability.claimed_amount).toFixed()).to.be.eq(claimed_tokens)
      expect(BigNumber(availability.balance).toFixed()).to.be.eq('0')
      expect(availability.expired).to.be.eq(true)
    })
  })

  describe('claim() test', async () => {
    it('should throw error when redpacket id does not exist', async () => {
      const claimParams = createClaimParams('not exist', accounts[1], accounts[1])
      await expect(
        redpacket.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(Error)
    })

    it('should emit ClaimSuccess when everything is ok', async () => {
      const { claimParams } = await createThenGetClaimParams(accounts[1])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const claimResults = await getClaimRedPacketInfo(0)
      expect(claimResults[0]).to.have.property('id').that.to.be.not.null
    })

    it('should throw error when expired', async () => {
      creationParams.duration = 0
      const {claimParams} = await createThenGetClaimParams(accounts[1])
      await expect(
        redpacket.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(getRevertMsg('Expired'))
    })

    it('should throw error when out of stock', async () => {
      creationParams.number = 1
      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const availability = await redpacket.check_availability.call(redPacketInfo.id, { from: accounts[2] })
      expect(Number(availability.balance)).to.be.eq(0)
      const anotherClaimParams = createClaimParams(redPacketInfo.id, accounts[2], accounts[2])
      await expect(
        redpacket.claim.sendTransaction(...Object.values(anotherClaimParams), {
          from: accounts[2],
        }),
      ).to.be.rejectedWith(getRevertMsg('Out of stock'))
    })

    it('should throw error when password is wrong', async () => {
      let { claimParams } = await createThenGetClaimParams(accounts[1])
      var account = web3.eth.accounts.create();
      var privateKey = account.privateKey;
      // Use wrong private key to sign on Message
      var signedMsg = web3.eth.accounts.sign(accounts[1], privateKey).signature
      claimParams.signedMsg = signedMsg
      await expect(
        redpacket.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(getRevertMsg('Verification failed'))
    })

    it('should throw error when cheater use replay', async () => {
      let { claimParams } = await createThenGetClaimParams(accounts[1])
      await expect(
        redpacket.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[2],
        }),
      ).to.be.rejectedWith(getRevertMsg('Verification failed'))
    })

    it('should throw error when already claimed', async () => {
      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })

      const availability = await redpacket.check_availability.call(redPacketInfo.id, { from: accounts[1] })
      expect(BigNumber(availability.claimed_amount).toFixed()).not.to.be.eq('0')

      await expect(
        redpacket.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(getRevertMsg('Already claimed'))
    })

    it('should emit ClaimSuccess when everything is ok (token_type: 1)', async () => {
      creationParams.token_type = 1
      creationParams.token_addr = testtoken.address

      // create red packet
      await testtoken.transfer(accounts[0], creationParams.total_tokens + 1)
      await testtoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens, { from: accounts[0] })
      await redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
        from: accounts[0],
      })
      const redPacketInfo = await getRedPacketInfo()
      var signedMsg = web3.eth.accounts.sign(accounts[1], private_key).signature
      claimParams = {
        id : redPacketInfo.id,
        signedMsg: signedMsg,
        recipient: accounts[1],
      }
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const claimResults = await getClaimRedPacketInfo(0)
      expect(claimResults[0]).to.have.property('id').that.to.be.not.null
    })

    it('should BurnToken single-token redpacket work', async () => {
      creationParams.total_tokens = 8
      creationParams.number = 4
      creationParams.token_type = 1
      creationParams.token_addr = burntoken.address

      await burntoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens, { from: accounts[0] })
      await redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
        from: accounts[0],
      })
      const redPacketInfo = await getRedPacketInfo()

      // claim
      const claimParams1 = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      const claimParams2 = createClaimParams(redPacketInfo.id, accounts[2], accounts[2])
      const claimParams3 = createClaimParams(redPacketInfo.id, accounts[3], accounts[3])
      const claimParams4 = createClaimParams(redPacketInfo.id, accounts[4], accounts[4])

      await redpacket.claim.sendTransaction(...Object.values(claimParams1), {
        from: accounts[1],
      })
      await redpacket.claim.sendTransaction(...Object.values(claimParams2), {
        from: accounts[2],
      })
      await redpacket.claim.sendTransaction(...Object.values(claimParams3), {
        from: accounts[3],
      })
      await redpacket.claim.sendTransaction(...Object.values(claimParams4), {
        from: accounts[4],
      })
    })

    it('should claim BurnToken work', async () => {
      const redpacket_amount = new BigNumber(1e18);
      // Set Param 
      creationParams.total_tokens = redpacket_amount.toFixed()
      creationParams.number = 4
      creationParams.token_type = 1
      creationParams.token_addr = burntoken.address

      await burntoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens, { from: accounts[0] })
      await redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
        from: accounts[0],
      })
      const redPacketInfo = await getRedPacketInfo()

      // claim
      const claimParams1 = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      const claimParams2 = createClaimParams(redPacketInfo.id, accounts[2], accounts[2])
      const claimParams3 = createClaimParams(redPacketInfo.id, accounts[3], accounts[3])
      const claimParams4 = createClaimParams(redPacketInfo.id, accounts[4], accounts[4])

      await redpacket.claim.sendTransaction(...Object.values(claimParams1), {
        from: accounts[1],
      })
      await redpacket.claim.sendTransaction(...Object.values(claimParams2), {
        from: accounts[2],
      })
      await redpacket.claim.sendTransaction(...Object.values(claimParams3), {
        from: accounts[3],
      })
      await redpacket.claim.sendTransaction(...Object.values(claimParams4), {
        from: accounts[4],
      })

      const results = await getClaimRedPacketInfo(3)
      const v1 = BigNumber(results[0].claimed_value)
      const v2 = BigNumber(results[1].claimed_value)
      const v3 = BigNumber(results[2].claimed_value)
      const v4 = BigNumber(results[3].claimed_value)
      expect([v1, v2, v3].every(v => v.toFixed() === v4.toFixed())).to.be.false
      expect(BigNumber(creationParams.total_tokens).gt(v1.plus(v2).plus(v3).plus(v4))).to.be.true;
    })

    it('should claim random amount if set random', async () => {
      // Set Param 
      creationParams.total_tokens = BigNumber(1e18).toFixed()
      creationParams.number = 4
      creationParams.token_type = 1
      creationParams.token_addr = testtoken.address

      // create red packet
      await testtoken.transfer(accounts[0], creationParams.total_tokens)
      await testtoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens, { from: accounts[0] })
      await redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
        from: accounts[0],
      })
      const redPacketInfo = await getRedPacketInfo()

      // claim
      const claimParams1 = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      const claimParams2 = createClaimParams(redPacketInfo.id, accounts[2], accounts[2])
      const claimParams3 = createClaimParams(redPacketInfo.id, accounts[3], accounts[3])
      const claimParams4 = createClaimParams(redPacketInfo.id, accounts[4], accounts[4])

      await redpacket.claim.sendTransaction(...Object.values(claimParams1), {
        from: accounts[1],
      })
      await redpacket.claim.sendTransaction(...Object.values(claimParams2), {
        from: accounts[2],
      })
      await redpacket.claim.sendTransaction(...Object.values(claimParams3), {
        from: accounts[3],
      })
      await redpacket.claim.sendTransaction(...Object.values(claimParams4), {
        from: accounts[4],
      })

      const results = await getClaimRedPacketInfo(3)
      const v1 = BigNumber(results[0].claimed_value)
      const v2 = BigNumber(results[1].claimed_value)
      const v3 = BigNumber(results[2].claimed_value)
      const v4 = BigNumber(results[3].claimed_value)
      expect([v1, v2, v3].every(v => v.toFixed() === v4.toFixed())).to.be.false
      expect(
          v1
          .plus(v2)
          .plus(v3)
          .plus(v4)
          .toFixed(),
      ).to.be.eq(BigNumber(creationParams.total_tokens).toFixed())
       .and.to.be.eq(BigNumber(1e18).toFixed())
    })

    it('should claim at least 1 token when random token is 0', async () => {
      creationParams.total_tokens = 3
      creationParams.number = 3
      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      const claimParams2 = createClaimParams(redPacketInfo.id, accounts[2], accounts[2])
      const claimParams3 = createClaimParams(redPacketInfo.id, accounts[3], accounts[3])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      await redpacket.claim.sendTransaction(...Object.values(claimParams2), {
        from: accounts[2],
      })
      await redpacket.claim.sendTransaction(...Object.values(claimParams3), {
        from: accounts[3],
      })

      const results = await getClaimRedPacketInfo(2)
      const v1 = Number(results[0].claimed_value)
      const v2 = Number(results[1].claimed_value)
      const v3 = Number(results[2].claimed_value)

      expect(v1)
        .to.be.eq(v2)
        .and.to.be.eq(v3)
        .and.to.be.eq(1)
    })

    // Note: this test spends a long time, on my machine is 5116ms
    it('should create and claim successfully with 100 red packets and 100 claimers', async () => {
      creationParams.ifrandom = false
      const { results } = await testSuitCreateAndClaimManyRedPackets()
      const total_claimed_tokens = results.reduce((acc, cur) => BigNumber(cur.claimed_value).plus(acc), BigNumber(0))
      expect(total_claimed_tokens.toFixed())
        .to.be.eq(BigNumber(creationParams.total_tokens).toFixed())
        .and.to.be.eq(BigNumber(1e18).toFixed())
      expect(
        results.every(
          result => BigNumber(result.claimed_value).toFixed() === BigNumber(results[0].claimed_value).toFixed(),
        ),
      ).to.be.true
    })

    // Note: this test spends a long time, on my machine is 7516ms
    it('should create and claim successfully with 100 random red packets and 100 claimers', async () => {
      const { results } = await testSuitCreateAndClaimManyRedPackets()
      const total_claimed_tokens = results.reduce((acc, cur) => BigNumber(cur.claimed_value).plus(acc), BigNumber(0))
      expect(total_claimed_tokens.toFixed())
        .to.be.eq(BigNumber(creationParams.total_tokens).toFixed())
        .and.to.be.eq(BigNumber(1e18).toFixed())
    })
  })

  describe('refund() test', async () => {
    it('should throw error when the refunder is not creator', async () => {
      const { redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await expect(
        redpacket.refund.sendTransaction(redPacketInfo.id, {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(getRevertMsg('Creator Only'))
    })

    it('should throw error before expiry', async () => {
      const { redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await expect(
        redpacket.refund.sendTransaction(redPacketInfo.id, {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('Not expired yet'))
    })

    it("should throw error when there's no remaining", async () => {
      creationParams.number = 1
      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const availability = await redpacket.check_availability.call(redPacketInfo.id, { from: accounts[1] })
      expect(Number(availability.total)).to.be.eq(Number(availability.claimed))
      expect(Number(availability.balance)).to.be.eq(0)
      await helper.advanceTimeAndBlock(2000)
      await expect(
        redpacket.refund.sendTransaction(redPacketInfo.id, {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('None left in the red packet'))
    })

    it('should throw error when already refunded', async () => {
      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })

      await helper.advanceTimeAndBlock(2000)

      await redpacket.refund.sendTransaction(redPacketInfo.id, {
        from: accounts[0],
      })

      await expect(
        redpacket.refund.sendTransaction(redPacketInfo.id, {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('None left in the red packet'))
    })

    it('should refund eth successfully', async () => {
      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })

      await helper.advanceTimeAndBlock(2000)

      await redpacket.refund.sendTransaction(redPacketInfo.id, {
        from: accounts[0],
      })
    })

    it('should refund eth successfully (not random)', async () => {
      creationParams.ifrandom = false
      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })

      await helper.advanceTimeAndBlock(2000)

      await redpacket.refund.sendTransaction(redPacketInfo.id, {
        from: accounts[0],
      })
      const result = await getRefundRedPacketInfo()
      expect(result)
        .to.have.property('id')
        .that.to.be.eq(redPacketInfo.id)
      expect(result)
        .to.have.property('token_address')
        .that.to.be.eq(eth_address)
      expect(Number(result.remaining_balance)).to.be.eq(66666667)
    })

    it('should refund erc20 successfully', async () => {
      creationParams.ifrandom = false
      creationParams.token_type = 1
      creationParams.token_addr = testtoken.address

      await testtoken.transfer(accounts[0], creationParams.total_tokens)
      await testtoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens, { from: accounts[0] })

      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })

      await helper.advanceTimeAndBlock(2000)

      await redpacket.refund.sendTransaction(redPacketInfo.id, {
        from: accounts[0],
      })
      const result = await getRefundRedPacketInfo()
      expect(result)
        .to.have.property('id')
        .that.to.be.eq(redPacketInfo.id)
      expect(result)
        .to.have.property('token_address')
        .that.to.be.eq(testtoken.address)
      expect(Number(result.remaining_balance)).to.be.eq(66666667)

      const allowance = await testtoken.allowance(redpacket.address, accounts[0])
      expect(Number(allowance)).to.be.eq(0)
    })

    // Note: this test spends a long time, on my machine is 10570ms
    it("should refund erc20 successfully when there're 100 red packets and 50 claimers", async () => {
      creationParams.ifrandom = false
      const { redPacketInfo } = await testSuitCreateAndClaimManyRedPackets(50)
      await helper.advanceTimeAndBlock(2000)
      await redpacket.refund.sendTransaction(redPacketInfo.id, {
        from: accounts[0],
      })
      const result = await getRefundRedPacketInfo()
      expect(result)
        .to.have.property('token_address')
        .that.to.be.eq(testtoken.address)
      expect(BigNumber(result.remaining_balance).toFixed())
        .to.be.eq(
          BigNumber(creationParams.total_tokens)
            .div(2)
            .toFixed(),
        )
        .and.to.be.eq(BigNumber(5e17).toFixed())
    })
  })

  async function testSuitCreateAndClaimManyRedPackets(claimers = 100) {
    creationParams.total_tokens = BigNumber(1e18).toFixed()
    creationParams.number = 100
    creationParams.token_type = 1
    creationParams.token_addr = testtoken.address

    await testtoken.transfer(accounts[0], creationParams.total_tokens)
    await testtoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens, { from: accounts[0] })

    await createRedPacket()
    const redPacketInfo = await getRedPacketInfo()

    await Promise.all(
      Array.from(Array(claimers).keys()).map(i => {
        const claimParams = createClaimParams(redPacketInfo.id, accounts[i], accounts[i])
        return new Promise(resolve => {
          redpacket.claim
            .sendTransaction(...Object.values(claimParams), {
              from: accounts[i],
            })
            .then(() => resolve())
        })
      }),
    )

    const results = await getClaimRedPacketInfo(claimers - 1)
    return { results, redPacketInfo }
  }

  async function getRedPacketInfo() {
    const logs = await web3.eth.getPastLogs({
      address: redpacket.address,
      topic: [web3.utils.sha3(creation_success_encode)],
    })
    return web3.eth.abi.decodeParameters(creation_success_types, logs[0].data)
  }

  function getRevertMsg(msg) {
    return `VM Exception while processing transaction: reverted with reason string '${msg}'`
  }

  async function createThenGetClaimParams(account) {
    await createRedPacket()
    const redPacketInfo = await getRedPacketInfo()
    return { claimParams: createClaimParams(redPacketInfo.id, account, account), redPacketInfo }
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

  async function getRefundRedPacketInfo() {
    const logs = await web3.eth.getPastLogs({
      address: redpacket.address,
      topic: [web3.utils.sha3(refund_success_encode)],
    })
    return web3.eth.abi.decodeParameters(refund_success_types, logs[0].data)
  }

  function createClaimParams(id, recipient, caller) {
    var signedMsg = web3.eth.accounts.sign(caller, private_key).signature
    return {
      id,
      signedMsg,
      recipient,
    }
  }
})
