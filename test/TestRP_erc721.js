const BigNumber = require('bignumber.js')
const chai = require('chai')
const expect = chai.expect
chai.use(require('chai-as-promised'))
const helper = require('./helper')
const {
  creation_success_encode,
  creation_success_types,
  claim_success_encode,
  claim_success_types,
  public_key,
  private_key,
} = require('./erc721_test_constants')

const TestToken_721 = artifacts.require('TestToken_721')
const HappyRedPacket_ERC721 = artifacts.require('HappyRedPacket_ERC721')
/** 
 * Sometimes the gas estimated is not precise due to randomness. So we have a gasLimit_multiplying_factor to increase the gasLimit. 
 * Metamask gasLimit is also using this factor
*/
const gasLimit_multiplying_factor = 1.5 

contract('HappyRedPacket_ERC721', accounts => {
  let snapShot
  let snapshotId
  let test_token_721
  let redpacket_721
  let creationParams
  let SignedMsgs

  before(async () => {
    snapShot = await helper.takeSnapshot()
    snapshotId = snapShot['result']
    redpacket_721 = await HappyRedPacket_ERC721.deployed()
    test_token_721 = await TestToken_721.deployed()
    SignedMsgs = getSignedMsgs(accounts)
  })

  beforeEach(async () => {
    var input_token_ids = [0, 1, 2]
    creationParams = {
      public_key,
      duration: 1000,
      seed: web3.utils.sha3('lajsdklfjaskldfhaikl'),
      message: 'Hi',
      name: 'cache',
      token_addr: test_token_721.address,
      erc721_token_ids: input_token_ids,
    }
    await test_token_721.setApprovalForAll(redpacket_721.address, true)
  })

  afterEach(async () => {
    await helper.revertToSnapShot(snapshotId)
  })

  describe('create_red_packet() test', async () => {
    it('should throw error when token number is less than 1', async () => {
      creationParams.erc721_token_ids = []
      await expect(
        redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('At least 1 recipient'))
    })

    it('should throw error when token number is more than 256', async () => {
      token_ids = []
      for (var i = 0; i < 258; i++) {
        token_ids.push(i)
      }
      creationParams.erc721_token_ids = token_ids
      await expect(
        redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('At most 256 recipient'))
    })

    it('should throw error when the contract is not approved', async () => {
      await test_token_721.setApprovalForAll(redpacket_721.address, false)
      await expect(
        redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('No approved yet'))
    })

    it('should return false when trying to check ownership with nft ids which does not belong to user', async () => {
      await test_token_721.safeTransferFrom(accounts[0], accounts[3], 20)
      creationParams.erc721_token_ids = [20, 21, 22]
      const is_owner = await redpacket_721.check_ownership.call(
        creationParams.erc721_token_ids,
        test_token_721.address,
        {
          from: accounts[0],
        },
      )
      expect(is_owner).to.be.eq(false)
    })

    it('should emit CreationSuccess when everything is ok', async () => {
      await redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
        from: accounts[0],
      })
      const result = await getRedPacketInfo()
      expect(result)
        .to.have.property('total_tokens')
        .that.to.be.eq(creationParams.erc721_token_ids.length.toString())
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

  describe('check_ownership() test', async () => {
    it('should return false when all of input token ids do not belong to caller', async () => {
      await test_token_721.safeTransferFrom(accounts[0], accounts[2], 11, {
        from: accounts[0],
      })
      await test_token_721.safeTransferFrom(accounts[0], accounts[2], 10, {
        from: accounts[0],
      })
      const ownership = await redpacket_721.check_ownership.call([10, 11], test_token_721.address, { from: accounts[0] })
      expect(ownership).to.be.eq(false)
    })

    it('should return false when part of input token ids do not belong to caller', async () => {
      await test_token_721.safeTransferFrom(accounts[0], accounts[2], 43, {
        from: accounts[0],
      })
      const ownership = await redpacket_721.check_ownership.call([43, 44], test_token_721.address, { from: accounts[0] })
      expect(ownership).to.be.eq(false)
    })

    it('should return true when all of input token ids belong to caller', async () => {
      const ownership = await redpacket_721.check_ownership.call([45, 46], test_token_721.address, { from: accounts[0] })
      expect(ownership).to.be.eq(true)
    })
  })

  describe('check_availability() test', async () => {
    it('should throw error when red packet does not exist', async () => {
      await expect(redpacket_721.check_availability.call('id not exist', { from: accounts[1] })).to.be.rejectedWith(
        Error,
      )
    })

    it('should return availability status when everything is ok', async () => {
      await createRedPacket(creationParams.erc721_token_ids)
      const redPacketInfo = await getRedPacketInfo()
      const availability = await redpacket_721.check_availability.call(redPacketInfo.id, { from: accounts[1] })
      expect(availability).to.be.an('object')
      expect(availability.token_address).to.be.eq(test_token_721.address)
      expect(availability.expired).to.be.eq(false)
      expect(BigNumber(availability.balance).toFixed()).to.be.eq('3')
      expect(BigNumber(availability.total_pkts).toFixed()).to.be.eq('3')
      expect(BigNumber(availability.claimed_id).toFixed()).to.be.eq('0')
      expect(BigNumber(availability.bit_status).toFixed()).to.be.eq('0')
    })

    it('should return red packet info when expired', async () => {
      await createRedPacket([33, 34, 35])
      const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const claimResults = await getClaimRedPacketInfo(0)
      const claimed_id = claimResults[0].claimed_token_id

      await helper.advanceTimeAndBlock(2000)

      const claimed = await redpacket_721.check_claimed_id.call(redPacketInfo.id, { from: accounts[1] })

      const availability = await redpacket_721.check_availability.call(redPacketInfo.id, { from: accounts[1] })
      expect(Number(availability.total_pkts)).to.be.eq(3)
      expect(Number(availability.balance)).to.be.eq(2)
      expect(Number(availability.claimed_id))
        .to.be.eq(Number(claimed))
        .and.to.be.eq(Number(claimed_id))
      const calculated_claim_number = countSetBits(Number(availability.bit_status))
      expect(calculated_claim_number).to.be.eq(1)
      expect(availability.expired).to.be.eq(true)
      expect(availability.token_address).to.be.eq(test_token_721.address)
    })
  })

  describe('claim() test', async () => {
    // This test case may take a long time, On my machine it takes 9484ms
    it('should throw error when the nft is transferred to others before claim ', async () => {
      await createRedPacket([6])
      const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await test_token_721.safeTransferFrom(accounts[0], accounts[2], 6, {
        from: accounts[0],
      })
      await expect(
        redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(
        "VM Exception while processing transaction: reverted with reason string 'No available token remain'",
      )
    })

    it('should emit ClaimSuccess when part of the nft is transferred to others before claim ', async () => {
      await createRedPacket([7, 8, 9])
      const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await test_token_721.safeTransferFrom(accounts[0], accounts[2], 7, {
        from: accounts[0],
      })
      await test_token_721.safeTransferFrom(accounts[0], accounts[2], 8, {
        from: accounts[0],
      })

      await redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const claimResults = await getClaimRedPacketInfo(0)
      expect(claimResults[0]).to.have.property('id').that.to.be.not.null

      var claimed_token_id = claimResults[0].claimed_token_id
      expect(claimed_token_id).to.be.eq('9')
      var current_owner = await test_token_721.ownerOf(claimed_token_id)
      expect(current_owner).to.be.eq(accounts[1])

      const availability = await redpacket_721.check_availability.call(redPacketInfo.id, { from: accounts[1] })
      const calculated_claim_number = countSetBits(Number(availability.bit_status))
      expect(Number(availability.balance)).to.be.eq(3 - calculated_claim_number)
    })

    it('should emit ClaimSuccess when everything is ok', async () => {
      await createRedPacket([3, 4, 5])
      const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const claimResults = await getClaimRedPacketInfo(0)
      expect(claimResults[0]).to.have.property('id').that.to.be.not.null

      var claimed_token_id = claimResults[0].claimed_token_id
      var current_owner = await test_token_721.ownerOf(claimed_token_id)
      expect(current_owner).to.be.eq(accounts[1])

      const availability = await redpacket_721.check_availability.call(redPacketInfo.id, { from: accounts[1] })
      expect(Number(availability.balance)).to.be.eq(2)
    })

    it('should throw error when redpacket id does not exist', async () => {
      const claimParams = createClaimParams('not exist', accounts[1], accounts[1])
      await expect(
        redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(Error)
    })

    it('should throw error when expired', async () => {
      creationParams.duration = 0
      await createRedPacket(creationParams.erc721_token_ids)
      const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await expect(
        redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(getRevertMsg('Expired'))
    })

    it('should throw error when out of stock', async () => {
      await createRedPacket([30])
      const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const availability = await redpacket_721.check_availability.call(redPacketInfo.id, { from: accounts[2] })
      expect(Number(availability.balance)).to.be.eq(0)
      const anotherClaimParams = createClaimParams(redPacketInfo.id, accounts[2], accounts[2])
      await expect(
        redpacket_721.claim.sendTransaction(...Object.values(anotherClaimParams), {
          from: accounts[2],
        }),
      ).to.be.rejectedWith(getRevertMsg('No available token remain'))
    })

    it('should throw error when password is wrong', async () => {
      await createRedPacket(creationParams.erc721_token_ids)
      const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      var account = web3.eth.accounts.create()
      var wrong_private_key = account.privateKey
      // Use wrong private key to sign on Message
      var signedMsg = web3.eth.accounts.sign(accounts[1], wrong_private_key).signature
      claimParams.signedMsg = signedMsg
      await expect(
        redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(getRevertMsg('verification failed'))
    })

    it('should throw error when cheater use replay', async () => {
      await createRedPacket(creationParams.erc721_token_ids)
      const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await expect(
        redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[2],
        }),
      ).to.be.rejectedWith(getRevertMsg('verification failed'))
    })

    it('should throw error when already claimed', async () => {
      await createRedPacket([40, 41, 42])
      const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })

      const availability = await redpacket_721.check_availability.call(redPacketInfo.id, { from: accounts[1] })

      await expect(
        redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(getRevertMsg('Already claimed'))
    })

    // Note: this test spends a long time, on my machine is 7511ms
    it('should create and claim successfully with 100 red packets and 100 claimers', async () => {
      var erc_token_ids = []
      for (var i = 100; i < 200; i++) {
        erc_token_ids.push(i)
      }
      const { results } = await testSuitCreateAndClaimManyRedPackets(erc_token_ids, 100)
      var claimed_ids = []
      results.reduce((acc, cur) => claimed_ids.push(cur.claimed_token_id))
      claimed_ids.push(results[0].claimed_token_id)
      var claimed_ids_set = new Set(claimed_ids)
      expect(claimed_ids_set.size).to.be.eq(claimed_ids.length)
      expect(claimed_ids_set.size).to.be.eq(100)
    })
  })

  describe('check_claimed_id() test', async () => {
    it('should throw error when red packet does not exist', async () => {
      await expect(redpacket_721.check_claimed_id.call('id not exist', { from: accounts[1] })).to.be.rejectedWith(Error)
    })

    it('should return claimed id when everything is ok', async () => {
      await createRedPacket([13, 14, 15])
      const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const claimed_id = await redpacket_721.check_claimed_id.call(redPacketInfo.id, { from: accounts[1] })
      expect(claimed_id).to.be.an('object')
      expect(Number(claimed_id))
        .to.be.gte(13)
        .and.to.be.lte(15)
    })

    it('should return claimed id when everything is ok (after expire)', async () => {
      await createRedPacket([201, 202, 203])
      const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })

      const claimResults = await getClaimRedPacketInfo(0)
      const claimed_id_log = claimResults[0].claimed_token_id

      await helper.advanceTimeAndBlock(2000)

      const claimed_id = await redpacket_721.check_claimed_id.call(redPacketInfo.id, { from: accounts[1] })
      expect(claimed_id).to.be.an('object')
      expect(Number(claimed_id))
        .to.be.gte(201)
        .and.to.be.lte(203)
        .to.be.eq(Number(claimed_id_log))
    })
  })

  describe('check_erc721_remain_ids() test', async () => {
    it('should throw error when red packet does not exist', async () => {
      await expect(
        redpacket_721.check_erc721_remain_ids.call('id not exist', { from: accounts[1] }),
      ).to.be.rejectedWith(Error)
    })

    it('should return remained id when everything is ok', async () => {
      var input_erc_ids = [16, 17, 18]
      await createRedPacket(input_erc_ids)
      const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const claimed_id = await redpacket_721.check_claimed_id.call(redPacketInfo.id, { from: accounts[1] })
      const remaining = await redpacket_721.check_erc721_remain_ids.call(redPacketInfo.id, { from: accounts[1] })
      expect(remaining).to.be.an('object')
      var bit_status = Number(remaining.bit_status)
      var erc_token_ids = remaining.erc721_token_ids
      var id = Number(claimed_id)
      let index
      for (var i = 0; i < erc_token_ids.length; i++) {
        if (Number(erc_token_ids[i]) == id) {
          index = i
        }
      }
      var is_set = (bit_status & (1 << index)) != 0
      expect(is_set).to.be.eq(true)
    })

    it('should return remained id when everything is ok (after expire)', async () => {
      var input_erc_ids = [204, 205, 206]
      await createRedPacket(input_erc_ids)
      const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })

      const claimResults = await getClaimRedPacketInfo(0)
      const claimed_id_log = claimResults[0].claimed_token_id

      await helper.advanceTimeAndBlock(2000)

      const remaining = await redpacket_721.check_erc721_remain_ids.call(redPacketInfo.id, { from: accounts[1] })
      expect(remaining).to.be.an('object')
      var bit_status = remaining.bit_status
      var erc_token_ids = remaining.erc721_token_ids
      var id = Number(claimed_id_log)
      let index
      for (var i = 0; i < erc_token_ids.length; i++) {
        if (Number(erc_token_ids[i]) == id) {
          index = i
        }
      }
      var is_set = (bit_status & (1 << index)) != 0
      expect(is_set).to.be.eq(true)
    })
  })

  async function testSuitCreateAndClaimManyRedPackets(erc_token_ids, claimers) {
    creationParams.token_addr = test_token_721.address

    await createRedPacket(erc_token_ids)
    const redPacketInfo = await getRedPacketInfo()

    await Promise.all(
      Array.from(Array(claimers).keys()).map(i => {
        var a = accounts[i]
        var signedMsg = SignedMsgs[a]
        const claimParams = {
          id: redPacketInfo.id,
          signedMsg,
          recipient: a,
        }
        return new Promise(resolve => {
          redpacket_721.claim
            .sendTransaction(...Object.values(claimParams), {
              from: a,
              gasLimit: 700000,
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
      address: redpacket_721.address,
      topic: [web3.utils.sha3(creation_success_encode)],
    })
    return web3.eth.abi.decodeLog(creation_success_types, logs[0].data, logs[0].topics.slice(1))
  }

  async function createRedPacket(erc_token_list) {
    creationParams.erc721_token_ids = erc_token_list
    await redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
      from: accounts[0],
    })
  }

  async function getClaimRedPacketInfo(fromBlock = 1) {
    const latestBlock = await web3.eth.getBlockNumber()
    const logs = await web3.eth.getPastLogs({
      address: redpacket_721.address,
      topic: [web3.utils.sha3(claim_success_encode)],
      fromBlock: latestBlock - fromBlock,
      toBlock: latestBlock,
    })
    return logs.map(log => web3.eth.abi.decodeLog(claim_success_types, log.data, log.topics.slice(1)))
  }


  function getRevertMsg(msg) {
    return `VM Exception while processing transaction: reverted with reason string '${msg}'`
  }

  function getSignedMsgs(sender_addrs) {
    var signedMsgs = {}
    for (var i = 0; i < sender_addrs.length; i++) {
      var signedMsg = web3.eth.accounts.sign(sender_addrs[i], private_key).signature
      signedMsgs[sender_addrs[i]] = signedMsg
    }
    return signedMsgs
  }

  function countSetBits(n) {
    var count = 0
    while (n) {
      count += n & 1
      n >>= 1
    }
    return count
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

contract('HappyRedPacket_ERC721 worst case test', accounts => {
  let snapShot
  let snapshotId
  let test_token_721
  let redpacket_721
  let creationParams

  before(async () => {
    snapShot = await helper.takeSnapshot()
    snapshotId = snapShot['result']
    redpacket_721 = await HappyRedPacket_ERC721.deployed()
    test_token_721 = await TestToken_721.deployed()
  })

  beforeEach(async () => {
    var input_token_ids = [0, 1, 2]
    creationParams = {
      public_key,
      duration: 1000,
      seed: web3.utils.sha3('lajsdklfjaskldfhaikl'),
      message: 'Hi',
      name: 'cache',
      token_addr: test_token_721.address,
      erc721_token_ids: input_token_ids,
    }
    await test_token_721.setApprovalForAll(redpacket_721.address, true)
  })

  afterEach(async () => {
    await helper.revertToSnapShot(snapshotId)
  })

  // Others test cases removed for testing
  describe('claim() worst case test', async () => {
    it('should claim NFT success if there exists available nft', async () => {
      const token_list = [];
      for (let i = 0; i < 256; i++) {
        token_list.push(i);
      }
      await createRedPacket(token_list)
      const redPacketInfo = await getRedPacketInfo()

      // random pick two nfts as the available nfts
      var random_left_nft = Math.floor(Math.random() * 256);
      var random_left_nft_2 = Math.floor(Math.random() * 256);
      while (random_left_nft_2 == random_left_nft) {
        random_left_nft_2 = Math.floor(Math.random() * 256);
      }
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      const claimParams_2 = createClaimParams(redPacketInfo.id, accounts[3], accounts[3])
      for (let i = 0; i < 256; i++) {
        if (i != random_left_nft && i != random_left_nft_2) {
          await test_token_721.safeTransferFrom(accounts[0], accounts[2], i, {
            from: accounts[0],
          })
        }
      }

      // for (let i = 0; i < 255; i++) {
      //   await test_token_721.safeTransferFrom(accounts[0], accounts[2], i, {
      //     from: accounts[0],
      //   })
      // }


      var estimatedGas = await redpacket_721.claim.estimateGas(...Object.values(claimParams), {
        from: accounts[1],
      })
      var final_estimatedGas = Math.round(estimatedGas * gasLimit_multiplying_factor)
      await redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
        gasLimit: final_estimatedGas
      });
      const claimResults = await getClaimRedPacketInfo(0)
      expect(claimResults[0]).to.have.property('id').that.to.be.not.null

      var claimed_token_id = claimResults[0].claimed_token_id
      // expect(claimed_token_id).to.be.eq('255')
      const oneOf = (claimed_token_id == random_left_nft.toString()) || (claimed_token_id == random_left_nft_2.toString())
      expect(oneOf).to.be.eq(true)

      var estimatedGas_2 = await redpacket_721.claim.estimateGas(...Object.values(claimParams_2), {
        from: accounts[3],
      })
      var final_estimatedGas_2 = Math.round(estimatedGas_2 * gasLimit_multiplying_factor)
      await redpacket_721.claim.sendTransaction(...Object.values(claimParams_2), {
        from: accounts[3],
        gasLimit: final_estimatedGas_2
      });
      const claimResults_2 = await getClaimRedPacketInfo(0)
      expect(claimResults_2[0]).to.have.property('id').that.to.be.not.null

      var claimed_token_id_2 = claimResults_2[0].claimed_token_id
      const oneOf_2 = (claimed_token_id_2 == random_left_nft.toString()) || (claimed_token_id_2 == random_left_nft_2.toString())
      expect(oneOf_2).to.be.eq(true)
      expect(claimed_token_id_2).to.be.not.eq(claimed_token_id)
    })
  })

  async function getRedPacketInfo() {
    const logs = await web3.eth.getPastLogs({
      address: redpacket_721.address,
      topic: [web3.utils.sha3(creation_success_encode)],
    })
    return web3.eth.abi.decodeLog(creation_success_types, logs[0].data, logs[0].topics.slice(1))
  }

  async function createRedPacket(erc_token_list) {
    creationParams.erc721_token_ids = erc_token_list
    await redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
      from: accounts[0],
    })
  }

  async function getClaimRedPacketInfo(fromBlock = 1) {
    const latestBlock = await web3.eth.getBlockNumber()
    const logs = await web3.eth.getPastLogs({
      address: redpacket_721.address,
      topic: [web3.utils.sha3(claim_success_encode)],
      fromBlock: latestBlock - fromBlock,
      toBlock: latestBlock,
    })
    return logs.map(log => web3.eth.abi.decodeLog(claim_success_types, log.data, log.topics.slice(1)))
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

contract('HappyRedPacket_ERC721 no available token test', accounts => {
  let snapShot
  let snapshotId
  let test_token_721
  let redpacket_721
  let creationParams

  before(async () => {
    snapShot = await helper.takeSnapshot()
    snapshotId = snapShot['result']
    redpacket_721 = await HappyRedPacket_ERC721.deployed()
    test_token_721 = await TestToken_721.deployed()
  })

  beforeEach(async () => {
    var input_token_ids = [0, 1, 2]
    creationParams = {
      public_key,
      duration: 1000,
      seed: web3.utils.sha3('lajsdklfjaskldfhaikl'),
      message: 'Hi',
      name: 'cache',
      token_addr: test_token_721.address,
      erc721_token_ids: input_token_ids,
    }
    await test_token_721.setApprovalForAll(redpacket_721.address, true)
  })

  afterEach(async () => {
    await helper.revertToSnapShot(snapshotId)
  })

  // Others test cases removed for testing
  describe('claim() test', async () => {
    // This test case may take a long time, On my machine it takes 9484ms
    it('should throw erro if all NFTs transfered', async () => {
      const token_list = [];
      for (let i = 0; i < 256; i++) {
        token_list.push(i);
      }
      await createRedPacket(token_list)
      const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      for (let i = 0; i < 256; i++) {
        await test_token_721.safeTransferFrom(accounts[0], accounts[2], i, {
          from: accounts[0],
        })
      }

      await expect(
        redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(
        "VM Exception while processing transaction: reverted with reason string 'No available token remain'",
      )
    })
  })


  async function getRedPacketInfo() {
    const logs = await web3.eth.getPastLogs({
      address: redpacket_721.address,
      topic: [web3.utils.sha3(creation_success_encode)],
    })
    return web3.eth.abi.decodeLog(creation_success_types, logs[0].data, logs[0].topics.slice(1))
  }

  async function createRedPacket(erc_token_list) {
    creationParams.erc721_token_ids = erc_token_list
    await redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
      from: accounts[0],
    })
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