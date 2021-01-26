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
  PASSWORD,
  eth_address,
} = require('./constants')

const TestToken = artifacts.require('TestToken')
const HappyRedPacket = artifacts.require('HappyRedPacket')

contract('HappyRedPacket', accounts => {
  let snapShot
  let snapshotId
  let testtoken
  let redpacket
  let creationParams

  beforeEach(async () => {
    snapShot = await helper.takeSnapshot()
    snapshotId = snapShot['result']
    testtoken = await TestToken.deployed()
    redpacket = await HappyRedPacket.deployed()
    creationParams = {
      hash: web3.utils.sha3(PASSWORD),
      number: 3,
      ifrandom: true,
      duration: 1000,
      seed: web3.utils.sha3('lajsdklfjaskldfhaikl'),
      message: 'Hi',
      name: 'cache',
      token_type: 0,
      token_addr: eth_address,
      total_tokens: 10,
    }
  })

  afterEach(async () => {
    await helper.revertToSnapShot(snapshotId)
  })

  it('Should return the HappyRedPacket contract creator', async () => {
    const contract_creator = await redpacket.contract_creator.call()
    expect(contract_creator).to.be.eq(accounts[0])
    expect(accounts.length).to.be.eq(100)
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
      ).to.be.rejectedWith(Error)
    })

    it('should throw error when total_tokens is less than number', async () => {
      creationParams.number = 11
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
      ).to.be.rejectedWith(Error)
    })

    it('should throw error when number is greater than 255', async () => {
      creationParams.number = 256
      await expect(
        redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
          value: creationParams.total_tokens,
        }),
      ).to.be.rejectedWith(Error)
    })

    it('should throw error when eth is not enough', async () => {
      await expect(
        redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
          value: creationParams.total_tokens - 1,
        }),
      ).to.be.rejectedWith(Error)
    })

    it('should throw error when erc20 token is not enough allowance', async () => {
      creationParams.token_type = 1
      creationParams.token_addr = testtoken.address
      await testtoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens - 1)
      await expect(
        redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(Error)
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

  describe('check_availability()', async () => {
    it('should throw error when red packet does not exist', async () => {
      await expect(redpacket.check_availability.call('id not exist', { from: accounts[1] })).to.be.rejectedWith(Error)
    })

    it('should return availability status when everything is ok', async () => {
      await createRedPacket()
      const redPacketInfo = await getRedPacketInfo()
      const result = await redpacket.check_availability.call(redPacketInfo.id, { from: accounts[1] })
      expect(result).to.be.an('object')
    })
  })

  describe('claim()', async () => {
    it('should throw error when redpacket id does not exist', async () => {
      const claimParams = createClaimParams('not exist', accounts[1])
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
      const { claimParams } = await createThenGetClaimParams(accounts[1])
      await expect(
        redpacket.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(Error)
    })

    it('should throw error when out of stock', async () => {
      creationParams.number = 1
      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const availability = await redpacket.check_availability.call(redPacketInfo.id, { from: accounts[2] })
      expect(Number(availability.balance)).to.be.eq(0)
      const anotherClaimParams = createClaimParams(redPacketInfo.id, accounts[2])
      await expect(
        redpacket.claim.sendTransaction(...Object.values(anotherClaimParams), {
          from: accounts[2],
        }),
      ).to.be.rejectedWith(Error)
    })

    it('should throw error when password is wrong', async () => {
      let { claimParams } = await createThenGetClaimParams(accounts[1])
      claimParams.password = 'wrong password'
      await expect(
        redpacket.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(Error)
    })

    it('should throw error when validation failed', async () => {
      let { claimParams } = await createThenGetClaimParams(accounts[1])
      claimParams.validation = 'wrong validation'
      await expect(
        redpacket.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(Error)
    })

    it('should throw error when already claimed', async () => {
      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })

      const availability = await redpacket.check_availability.call(redPacketInfo.id, { from: accounts[1] })

      expect(availability).have.property('ifclaimed').that.to.be.true
      await expect(
        redpacket.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(Error)
    })

    it('should claim average amount if not set random', async () => {
      creationParams.ifrandom = false
      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      const claimParams2 = createClaimParams(redPacketInfo.id, accounts[2])
      const claimParams3 = createClaimParams(redPacketInfo.id, accounts[3])
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
      expect(Number(results[0].claimed_value))
        .to.be.eq(Number(results[1].claimed_value))
        .and.to.be.eq(3)

      expect(Number(results[2].claimed_value)).and.to.be.eq(4)
    })

    it('should claim random amount if set random', async () => {
      creationParams.total_tokens = 1e5
      creationParams.number = 4
      creationParams.token_type = 1
      creationParams.token_addr = testtoken.address
      await testtoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens)
      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      const claimParams2 = createClaimParams(redPacketInfo.id, accounts[2])
      const claimParams3 = createClaimParams(redPacketInfo.id, accounts[3])
      const claimParams4 = createClaimParams(redPacketInfo.id, accounts[4])
      await redpacket.claim.sendTransaction(...Object.values(claimParams), {
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
      const v1 = Number(results[0].claimed_value)
      const v2 = Number(results[1].claimed_value)
      const v3 = Number(results[2].claimed_value)
      const v4 = Number(results[3].claimed_value)
      expect([v1, v2, v3].every(v => v === v4)).to.be.false
      expect(v1 + v2 + v3 + v4)
        .to.be.eq(creationParams.total_tokens)
        .and.to.be.eq(1e5)
    })

    // Note: this test is unable to increase the line coverage every time.
    // see https://softwareengineering.stackexchange.com/a/147142
    it('should claim at least 1 token when random token is 0', async () => {
      creationParams.total_tokens = 3
      creationParams.number = 3
      creationParams.token_type = 1
      creationParams.token_addr = testtoken.address
      await testtoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens)
      const { claimParams, redPacketInfo } = await createThenGetClaimParams(accounts[1])
      const claimParams2 = createClaimParams(redPacketInfo.id, accounts[2])
      const claimParams3 = createClaimParams(redPacketInfo.id, accounts[3])
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

    // Note: this test spends a long time, on my machine is about 30s
    it('should create and claim successfully with 100 red packets and 100 claimers', async () => {
      creationParams.ifrandom = false
      const { results } = await testSuitCreateAndClaimManyRedPackets()
      const total_claimed_tokens = results.reduce((acc, cur) => Number(cur.claimed_value) + acc, 0)
      expect(total_claimed_tokens)
        .to.be.eq(creationParams.total_tokens)
        .and.to.be.eq(1e5)
      expect(results.every(result => Number(result.claimed_value) === Number(results[0].claimed_value))).to.be.true
    })

    // Note: this test spends a long time, on my machine is about 40s
    it('should create and claim successfully with 100 random red packets and 100 claimers', async () => {
      const { results } = await testSuitCreateAndClaimManyRedPackets()
      const total_claimed_tokens = results.reduce((acc, cur) => Number(cur.claimed_value) + acc, 0)
      expect(total_claimed_tokens)
        .to.be.eq(creationParams.total_tokens)
        .and.to.be.eq(1e5)
    })
  })

  describe('refund()', async () => {
    it('should throw error when the refunder is not creator', async () => {
      const { redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await expect(
        redpacket.refund.sendTransaction(redPacketInfo.id, {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(Error)
    })

    it('should throw error before expiry', async () => {
      const { redPacketInfo } = await createThenGetClaimParams(accounts[1])
      await expect(
        redpacket.refund.sendTransaction(redPacketInfo.id, {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(Error)
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
      await expect(
        redpacket.refund.sendTransaction(redPacketInfo.id, {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(Error)
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

    it('should refund eth successfully', async () => {
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
      expect(Number(result.remaining_balance)).to.be.eq(7)
    })

    it('should refund erc20 successfully', async () => {
      creationParams.ifrandom = false
      creationParams.token_type = 1
      creationParams.token_addr = testtoken.address
      await testtoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens)

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
      expect(Number(result.remaining_balance)).to.be.eq(7)
    })

    // Note: this test spends a long time, on my machine is about 15s
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
      expect(Number(result.remaining_balance))
        .to.be.eq(creationParams.total_tokens / 2)
        .and.to.be.eq(50000)
    })
  })

  async function testSuitCreateAndClaimManyRedPackets(claimers = 100) {
    creationParams.total_tokens = 1e5
    creationParams.number = 100
    creationParams.token_type = 1
    creationParams.token_addr = testtoken.address
    await testtoken.approve.sendTransaction(redpacket.address, creationParams.total_tokens)

    await createRedPacket()
    const redPacketInfo = await getRedPacketInfo()

    await Promise.all(
      Array.from(Array(claimers).keys()).map(i => {
        const claimParams = createClaimParams(redPacketInfo.id, accounts[i])
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

  async function createThenGetClaimParams(account) {
    await createRedPacket()
    const redPacketInfo = await getRedPacketInfo()
    return { claimParams: createClaimParams(redPacketInfo.id, account), redPacketInfo }
  }

  function createClaimParams(id, recipient) {
    return {
      id,
      password: PASSWORD,
      recipient,
      validation: web3.utils.sha3(recipient),
    }
  }

  async function createRedPacket() {
    await redpacket.create_red_packet.sendTransaction(...Object.values(creationParams), {
      from: accounts[0],
      value: creationParams.total_tokens,
    })
  }

  async function getRedPacketInfo() {
    const logs = await web3.eth.getPastLogs({
      address: redpacket.address,
      topic: [web3.utils.sha3(creation_success_encode)],
    })
    return web3.eth.abi.decodeParameters(creation_success_types, logs[0].data)
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
})
