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
	refund_success_encode,
	refund_success_types,
	public_key,
	private_key,
	eth_address,
} = require('./erc721_test_constants')

const TestToken_721 = artifacts.require('TestToken_721');
const HappyRedPacket_ERC721 = artifacts.require('HappyRedPacket_ERC721')

contract('HappyRedPacket_ERC721', accounts => {
	let snapShot
	let snapshotId
	let testtoken
	let redpacket
	let creationParams
	let initial_owner

	before(async () => {
		snapShot = await helper.takeSnapshot()
		snapshotId = snapShot['result']
		redpacket_721 = await HappyRedPacket_ERC721.deployed()
		test_token_721 = await TestToken_721.deployed()
	})

	beforeEach(async () => {
		var input_token_ids = [0,1,2]
		creationParams = {
			public_key: public_key,
			number: 3,
			duration: 1000,
			seed: web3.utils.sha3('lajsdklfjaskldfhaikl'),
			message: 'Hi',
			name: 'cache',
			token_addr: test_token_721.address,
			total_tokens: 3,
			erc721_token_ids: input_token_ids,
		}
		await test_token_721.setApprovalForAll(redpacket_721.address, true)
	})

	afterEach(async () => {
		await helper.revertToSnapShot(snapshotId)
	})

	describe('create_red_packet() test', async () => {
		it('should throw error when expiration_time is greater than 2106', async () => {
			creationParams.duration = 2 ** 32
			await expect(
			  redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
					from: accounts[0],
			  }),
			).to.be.rejectedWith(Error)
		})

		it('should throw error when total_tokens != number', async () => {
      creationParams.number = 7
      await expect(
        redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('require #tokens = #packets'))
    })

		it('should throw error when number is less than 1', async () => {
      creationParams.number = 0
			creationParams.total_tokens = 0
        await expect(
          redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
            from: accounts[0],
          }),
        ).to.be.rejectedWith(getRevertMsg('At least 1 recipient'))
    })

		it('should throw error when number is greater than 255', async () => {
      creationParams.number = 256
			creationParams.total_tokens = 256
      await expect(
        redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('At most 255 recipients'))
    })

		it('should throw error no enough erc721_token_id is provided', async () => {
			creationParams.erc721_token_ids = [0,1,2,3]
      await expect(
        redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('No enough erc721_token_id provided'))
    })

		it('should throw error when the contract is not approved', async () => {
			await test_token_721.setApprovalForAll(redpacket_721.address, false)
      await expect(
        redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('No approved yet'))
    })

		it('should throw error when trying to create red packet with nft which does not belong to user', async () => {
			await test_token_721.safeTransferFrom(accounts[0], accounts[3], 20)
			creationParams.erc721_token_ids = [20,21,22]
      await expect(
        redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('Not your token'))
    })

		it('should emit CreationSuccess when everything is ok', async () => {
      await redpacket_721.create_red_packet.sendTransaction(...Object.values(creationParams), {
        from: accounts[0],
      })

      const result = await getRedPacketInfo()
      expect(result)
        .to.have.property('total_tokens')
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
      await expect(redpacket_721.check_availability.call('id not exist', { from: accounts[1] })).to.be.rejectedWith(Error)
    })

    it('should return availability status when everything is ok', async () => {
      await createRedPacket(creationParams.erc721_token_ids)
      const redPacketInfo = await getRedPacketInfo()
      const availability = await redpacket_721.check_availability.call(redPacketInfo.id, { from: accounts[1] })
      expect(availability).to.be.an('object')
      expect(BigNumber(availability.claimed_pkts).toFixed()).to.be.eq('0')
    })
  })

	describe('claim() test', async () => {
		// This test case may take a long time, On my machine it takes 9484ms
		it('should throw error when the nft is transferred to others before claim ', async () => {
      await createRedPacket([6,7,8])
			const redPacketInfo = await getRedPacketInfo()
			const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
			var transferred_token_ids = [6,7,8]
			for (var i = 0; i < transferred_token_ids.length; i ++){
				await test_token_721.safeTransferFrom(accounts[0], accounts[2], transferred_token_ids[i], {
          from: accounts[0],
        })
			}
      await expect(
        redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith("Returned error: VM Exception while processing transaction: out of gas")
      
    })

		it('should emit ClaimSuccess when everything is ok', async () => {
      await createRedPacket([3,4,5])
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
      creationParams.number = 1
			creationParams.total_tokens = 1
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
      ).to.be.rejectedWith(getRevertMsg('Out of stock'))
    })

		it('should throw error when password is wrong', async () => {
			await createRedPacket(creationParams.erc721_token_ids)
			const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      var account = web3.eth.accounts.create();
      var wrong_private_key = account.privateKey;
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
      await createRedPacket([40,41,42])
			const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })

      const availability = await redpacket_721.check_availability.call(redPacketInfo.id, { from: accounts[1] })
      expect(BigNumber(availability.claimed_pkts).toFixed()).not.to.be.eq('0')

      await expect(
        redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(getRevertMsg('Already claimed'))
    })

		// Note: this test spends a long time, on my machine is 7511ms
		it('should create and claim successfully with 50 red packets and 50 claimers', async () => {
			var erc_token_ids = []
			for (var i = 100; i < 150; i ++){
				erc_token_ids.push(i)
			}
      const { results } = await testSuitCreateAndClaimManyRedPackets(erc_token_ids, 50)
			var claimed_ids = []
      results.reduce((acc, cur) => claimed_ids.push(cur.claimed_token_id))
			claimed_ids.push(results[0].claimed_token_id)
			var claimed_ids_set = new Set(claimed_ids)
			expect(claimed_ids_set.size).to.be.eq(claimed_ids.length)
      expect(claimed_ids_set.size).to.be.eq(50)
    })

	})

	describe('refund() test', async () => {
		it('should throw error when the refunder is not creator', async () => {
      await createRedPacket(creationParams.erc721_token_ids)
			const redPacketInfo = await getRedPacketInfo()
      await expect(
        redpacket_721.refund.sendTransaction(redPacketInfo.id, {
          from: accounts[1],
        }),
      ).to.be.rejectedWith(getRevertMsg('Creator Only'))
    })

		it('should throw error before expiry', async () => {
      await createRedPacket(creationParams.erc721_token_ids)
			const redPacketInfo = await getRedPacketInfo()
      await expect(
        redpacket_721.refund.sendTransaction(redPacketInfo.id, {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('Not expired yet'))
    })

		it("should throw error when there's no remaining", async () => {
      creationParams.number = 1
			creationParams.total_tokens = 1
			await createRedPacket([25])
			const redPacketInfo = await getRedPacketInfo()
			const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })
      const availability = await redpacket_721.check_availability.call(redPacketInfo.id, { from: accounts[2] })
      expect(Number(availability.balance)).to.be.eq(0)

      await helper.advanceTimeAndBlock(2000)
      await expect(
        redpacket_721.refund.sendTransaction(redPacketInfo.id, {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('None left in the red packet'))
    })

		it('should throw error when already refunded', async () => {
      await createRedPacket([26,27,28])
			const redPacketInfo = await getRedPacketInfo()
      const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })

      await helper.advanceTimeAndBlock(2000)

      await redpacket_721.refund.sendTransaction(redPacketInfo.id, {
        from: accounts[0],
      })

      await expect(
        redpacket_721.refund.sendTransaction(redPacketInfo.id, {
          from: accounts[0],
        }),
      ).to.be.rejectedWith(getRevertMsg('Already Refunded'))
    })

		it('should refund successfully', async () => {
      await createRedPacket([29,31,32])
			const redPacketInfo = await getRedPacketInfo()
			const claimParams = createClaimParams(redPacketInfo.id, accounts[1], accounts[1])
      await redpacket_721.claim.sendTransaction(...Object.values(claimParams), {
        from: accounts[1],
      })

      await helper.advanceTimeAndBlock(2000)

      await redpacket_721.refund.sendTransaction(redPacketInfo.id, {
        from: accounts[0],
      })
    })

		// Note: this test spends a long time, on my machine is 10570ms
		it("should refund erc20 successfully when there're 50 red packets and 30 claimers", async () => {
			var erc_token_ids = []
			for (var i = 50; i < 100; i ++){
				erc_token_ids.push(i)
			}
      const { results, redPacketInfo } = await testSuitCreateAndClaimManyRedPackets(erc_token_ids, 30)
			var claimed_ids = []
      results.reduce((acc, cur) => claimed_ids.push(cur.claimed_token_id))
			claimed_ids.push(results[0].claimed_token_id)
			
      await helper.advanceTimeAndBlock(2000)
      await redpacket_721.refund.sendTransaction(redPacketInfo.id, {
        from: accounts[0],
      })
      const result = await getRefundRedPacketInfo()
			var get_ids_from_event = result.remaining_token_ids
			var remained = get_ids_from_event.slice(0, result.remaining_balance)
			var claimed_ids_set = new Set(claimed_ids)
			var remained_set = new Set(remained)
			expect(claimed_ids_set.size + remained_set.size).to.be.eq(50)
      expect(result)
        .to.have.property('token_address')
        .that.to.be.eq(test_token_721.address)
    })

	})

	async function testSuitCreateAndClaimManyRedPackets(erc_token_ids, claimers) {
    creationParams.total_tokens = 50
    creationParams.number = 50
    creationParams.token_addr = test_token_721.address
		
    await createRedPacket(erc_token_ids)
    const redPacketInfo = await getRedPacketInfo()

    await Promise.all(
      Array.from(Array(claimers).keys()).map(i => {
        const claimParams = createClaimParams(redPacketInfo.id, accounts[i], accounts[i])
        return new Promise(resolve => {
          redpacket_721.claim
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
      address: redpacket_721.address,
      topic: [web3.utils.sha3(creation_success_encode)],
    })
    return web3.eth.abi.decodeParameters(creation_success_types, logs[0].data)
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
    return logs.map(log => web3.eth.abi.decodeParameters(claim_success_types, log.data))
  }

	async function getRefundRedPacketInfo() {
    const logs = await web3.eth.getPastLogs({
      address: redpacket_721.address,
      topic: [web3.utils.sha3(refund_success_encode)],
    })
    return web3.eth.abi.decodeParameters(refund_success_types, logs[0].data)
  }

	function getRevertMsg(msg) {
    return `Returned error: VM Exception while processing transaction: revert ${msg} -- Reason given: ${msg}.`
  }

	function createClaimParams(id, recipient, caller) {
    var signedMsg = web3.eth.accounts.sign(caller, private_key).signature
    // var signedMsg_to_str = web3.utils.hexToAscii(signedMsg);
    return {
      id,
      signedMsg: signedMsg,
      recipient,
    }
  }

})