const chai = require('chai')
const expect = chai.expect
chai.use(require('chai-as-promised'))

const TestToken = artifacts.require('TestToken')
const Test721Token = artifacts.require('Test721Token')
const HappyRedPacket = artifacts.require('HappyRedPacket')
let testtoken
let test721token
let redpacket
let redpacket_id
let _total_tokens

contract('TestToken', accounts => {
  beforeEach(async () => {
    console.log('Before ALL\n')
    testtoken = await TestToken.deployed()
    redpacket = await HappyRedPacket.deployed()
    _total_tokens = 101
  })

  it('Should return the HappyRedPacket contract creator', async () => {
    const contract_creator = await redpacket.contract_creator.call()
    expect(contract_creator).to.be.eql(accounts[0])
  })

  it('Should return a redpacket id', async () => {
    const passwords = ['1', '2']
    const hashes = passwords.map(function(pass) {
      return web3.utils.sha3(pass)
    })
    const name = 'cache'
    const msg = 'hi'
    const number = 3
    const duration = 1200
    const seed = web3.utils.sha3('lajsdklfjaskldfhaikl')
    const token_type = 1
    const token_address = testtoken.address
    const token_ids = []
    const total_tokens = _total_tokens

    const creation_success_encode = 'CreationSuccess(uint256,bytes32,string,string,address,uint256,address,uint256[])'
    const creation_success_types = [
      'uint256',
      'bytes32',
      'string',
      'string',
      'address',
      'uint256',
      'address',
      'uint256[]',
    ]

    await testtoken.approve.sendTransaction(redpacket.address, total_tokens)
    const creation_receipt = await redpacket.create_red_packet.sendTransaction(
      hashes[0],
      number,
      true,
      duration,
      seed,
      msg,
      name,
      token_type,
      token_address,
      total_tokens,
      token_ids,
    )
    const logs = await web3.eth.getPastLogs({
      address: redpacket.address,
      topics: [web3.utils.sha3(creation_success_encode)],
    })
    redpacket_id = web3.eth.abi.decodeParameters(creation_success_types, logs[0].data)['1']
    expect(redpacket_id).to.be.not.null
  })

  it('Should allow two users to claim red packets.', async () => {
    const redpacket = await HappyRedPacket.deployed()
    const password = '1'
    const rp_id = redpacket_id

    const claim_success_encode = 'ClaimSuccess(%s,%s,%s,%s)'
    const claim_success_types = ['bytes32', 'address', 'uint256', 'address']

    // Check Availability
    let returned = await redpacket.check_availability.call(rp_id)
    assert.equal(returned.ifclaimed, false)

    // 1st
    const recipient1 = accounts[1]
    const validation1 = web3.utils.sha3(recipient1)

    const claim_receipt = await redpacket.claim.sendTransaction(rp_id, password, recipient1, validation1, {
      from: recipient1,
    })
    const logs = await web3.eth.getPastLogs({
      address: redpacket.address,
      topic: [web3.utils.sha3(claim_success_encode)],
    })
    //console.log(web3.eth.abi.decodeParameters(claim_success_types, logs[0].data));

    // Check Availability
    returned = await redpacket.check_availability.call(rp_id, {
      from: recipient1,
    })
    expect(returned).to.have.property('ifclaimed').that.to.be.true

    // 2nd
    const recipient2 = accounts[2]
    const validation2 = web3.utils.sha3(recipient2)

    const claim_receipt2 = await redpacket.claim.sendTransaction(rp_id, password, recipient2, validation2, {
      from: recipient2,
    })
    const logs2 = await web3.eth.getPastLogs({
      address: redpacket.address,
      topic: [web3.utils.sha3(claim_success_encode)],
    })
    //console.log(web3.eth.abi.decodeParameters(claim_success_types, logs2[0].data));

    // Check Availability
    returned = await redpacket.check_availability.call(rp_id, {
      from: recipient2,
    })
    expect(returned).to.have.property('ifclaimed').that.to.be.true

    // 3rd
    const recipient3 = accounts[3]
    const validation3 = web3.utils.sha3(recipient3)

    const claim_receipt3 = await redpacket.claim.sendTransaction(rp_id, password, recipient3, validation3, {
      from: recipient3,
    })
    const logs3 = await web3.eth.getPastLogs({
      address: redpacket.address,
      topic: [web3.utils.sha3(claim_success_encode)],
    })
    //console.log(web3.eth.abi.decodeParameters(claim_success_types, logs3[0].data));

    // Check Availability
    returned = await redpacket.check_availability.call(rp_id, {
      from: recipient3,
    })
    expect(returned).to.have.property('ifclaimed').that.to.be.true

    // Check balance
    const balance1 = await testtoken.balanceOf.call(recipient1, {
      from: recipient1,
    })
    const balance2 = await testtoken.balanceOf.call(recipient2, {
      from: recipient2,
    })
    const balance3 = await testtoken.balanceOf.call(recipient3, {
      from: recipient3,
    })
    const balance4 = await testtoken.balanceOf.call(accounts[4], {
      from: accounts[4],
    })

    expect(Number(balance1)).to.be.greaterThan(0)
    expect(Number(balance2)).to.be.greaterThan(0)
    expect(Number(balance3)).to.be.greaterThan(0)
    expect(Number(balance4)).to.be.eql(0)
    expect(Number(balance1) + Number(balance2) + Number(balance3)).to.be.eq(_total_tokens)
  })
})
contract('TestToken', accounts => {
  beforeEach(async () => {
    console.log('Before ALL\n')
    testtoken = await TestToken.deployed()
    redpacket = await HappyRedPacket.deployed()
    _total_tokens = 101
  })

  it('Should return the HappyRedPacket contract creator', async () => {
    const contract_creator = await redpacket.contract_creator.call()
    expect(contract_creator).to.be.eql(accounts[0])
  })

  it('Should return a redpacket id', async () => {
    const passwords = ['1', '2']
    const hashes = passwords.map(function(pass) {
      return web3.utils.sha3(pass)
    })
    const name = 'cache'
    const msg = 'hi'
    const number = 3
    const duration = 0
    const seed = web3.utils.sha3('lajsdklfjaskldfhaikl')
    const token_type = 1
    const token_address = testtoken.address
    const token_ids = []
    const total_tokens = _total_tokens

    const creation_success_encode = 'CreationSuccess(uint256,bytes32,string,string,address,uint256,address,uint256[])'
    const creation_success_types = [
      'uint256',
      'bytes32',
      'string',
      'string',
      'address',
      'uint256',
      'address',
      'uint256[]',
    ]

    await testtoken.approve.sendTransaction(redpacket.address, total_tokens)
    const creation_receipt = await redpacket.create_red_packet.sendTransaction(
      hashes[0],
      number,
      true,
      duration,
      seed,
      msg,
      name,
      token_type,
      token_address,
      total_tokens,
      token_ids,
    )
    const logs = await web3.eth.getPastLogs({
      address: redpacket.address,
      topics: [web3.utils.sha3(creation_success_encode)],
    })
    redpacket_id = web3.eth.abi.decodeParameters(creation_success_types, logs[0].data)['1']
    expect(redpacket_id).to.be.not.null
  })

  it('Should refund the red packets.', async () => {
    const redpacket = await HappyRedPacket.deployed()
    const rp_id = redpacket_id

    const refund_success_encode = 'RefundSuccess(%s,%s,%s)'
    const refund_success_types = ['bytes32', 'address', 'uint256']

    const refund_receipt = await redpacket.refund.sendTransaction(rp_id, {
      from: accounts[0],
    })
    const logs = await web3.eth.getPastLogs({
      address: redpacket.address,
      topic: [web3.utils.sha3(refund_success_encode)],
    })
    //console.log(web3.eth.abi.decodeParameters(refund_success_types, logs[0].data));
  })
})
contract('Test721Token', accounts => {
  beforeEach(async () => {
    console.log('Before ALL\n')
    test721token = await Test721Token.deployed()
    redpacket = await HappyRedPacket.deployed()
    _total_tokens = 10
  })
  it('Should return the HappyRedPacket contract creator', async () => {
    const contract_creator = await redpacket.contract_creator.call()
    expect(contract_creator).to.be.eql(accounts[0])
  })
  it('Should return a redpacket id', async () => {
    const passwords = ['1', '2']
    const hashes = passwords.map(function(pass) {
      return web3.utils.sha3(pass)
    })
    const name = 'cache'
    const msg = 'hi'
    const number = 3
    const duration = 1200
    const seed = web3.utils.sha3('lajsdklfjaskldfhaikl')
    const token_type = 2
    const token_address = test721token.address
    // const token_total = await test721token.balanceOf.call(accounts[0]);
    const token_total = 5
    const token_ids = []
    for (i = 0; i < token_total; i++) {
      token_id = await test721token.tokenOfOwnerByIndex.call(accounts[0], i)
      token_ids.push(token_id)
    }
    const total_tokens = token_ids.length

    const creation_success_encode = 'CreationSuccess(uint256,bytes32,string,string,address,uint256,address,uint256[])'
    const creation_success_types = [
      'uint256',
      'bytes32',
      'string',
      'string',
      'address',
      'uint256',
      'address',
      'uint256[]',
    ]

    await test721token.setApprovalForAll.sendTransaction(redpacket.address, true)
    const creation_receipt = await redpacket.create_red_packet.sendTransaction(
      hashes[0],
      number,
      true,
      duration,
      seed,
      msg,
      name,
      token_type,
      token_address,
      total_tokens,
      token_ids,
    )
    const balance = await test721token.balanceOf(redpacket.address)
    const logs = await web3.eth.getPastLogs({
      address: redpacket.address,
      topics: [web3.utils.sha3(creation_success_encode)],
    })
    log = web3.eth.abi.decodeParameters(creation_success_types, logs[0].data)
    redpacket_id = log['1']
    redpacket_token_ids = log['5']
    expect(redpacket_id).to.be.not.null
    expect(token_ids).to.be.not.null
    expect(Number(balance)).to.be.eq(5)
  })
  it('Should allow two users to claim red packets.', async () => {
    const password = '1'
    const rp_id = redpacket_id

    const claim_success_encode = 'ClaimSuccess(%s,%s,%s,%s)'
    const claim_success_types = ['bytes32', 'address', 'uint256', 'address']

    // Check Availability
    let returned = await redpacket.check_availability.call(rp_id)
    expect(returned).to.have.property('ifclaimed').that.to.be.false

    // 1st
    const recipient1 = accounts[1]
    const validation1 = web3.utils.sha3(recipient1)

    const claim_receipt = await redpacket.claim.sendTransaction(rp_id, password, recipient1, validation1, {
      from: recipient1,
    })
    const logs = await web3.eth.getPastLogs({
      address: redpacket.address,
      topic: [web3.utils.sha3(claim_success_encode)],
    })

    // Check Availability
    returned = await redpacket.check_availability.call(rp_id, {
      from: recipient1,
    })
    expect(returned).to.have.property('ifclaimed').that.to.be.true

    // 2nd
    const recipient2 = accounts[2]
    const validation2 = web3.utils.sha3(recipient2)

    const claim_receipt2 = await redpacket.claim.sendTransaction(rp_id, password, recipient2, validation2, {
      from: recipient2,
    })
    const logs2 = await web3.eth.getPastLogs({
      address: redpacket.address,
      topic: [web3.utils.sha3(claim_success_encode)],
    })

    // Check Availability
    returned = await redpacket.check_availability.call(rp_id, {
      from: recipient2,
    })
    expect(returned).to.have.property('ifclaimed').that.to.be.true

    // 3rd
    const recipient3 = accounts[3]
    const validation3 = web3.utils.sha3(recipient3)

    const claim_receipt3 = await redpacket.claim.sendTransaction(rp_id, password, recipient3, validation3, {
      from: recipient3,
    })
    const logs3 = await web3.eth.getPastLogs({
      address: redpacket.address,
      topic: [web3.utils.sha3(claim_success_encode)],
    })
    // Check Availability
    returned = await redpacket.check_availability.call(rp_id, {
      from: recipient3,
    })
    expect(returned).to.have.property('ifclaimed').that.to.be.true

    // Check balance
    const balance1 = await test721token.balanceOf.call(recipient1, {
      from: recipient1,
    })
    const balance2 = await test721token.balanceOf.call(recipient2, {
      from: recipient2,
    })
    const balance3 = await test721token.balanceOf.call(recipient3, {
      from: recipient3,
    })
    const balance4 = await test721token.balanceOf.call(accounts[4], {
      from: accounts[4],
    })

    expect(Number(balance1)).to.be.greaterThan(0)
    expect(Number(balance2)).to.be.greaterThan(0)
    expect(Number(balance3)).to.be.greaterThan(0)
    expect(Number(balance4)).to.be.eql(0)
    expect(Number(balance1) + Number(balance2) + Number(balance3)).to.be.eq(_total_tokens)
  })
})
