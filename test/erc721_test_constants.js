const Web3 = require('web3')
var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))
var account = web3.eth.accounts.create()
var private_key = account.privateKey
var public_key = account.address

const creation_success_encode =
  'CreationSuccess(uint256,bytes32,string,string,address,uint256,address,uint256,uint256,uint256[])'
const creation_success_types = [
  { type: 'uint256', name: 'total_tokens' },
  { type: 'bytes32', name: 'id' },
  { type: 'string', name: 'name' },
  { type: 'string', name: 'message' },
  { type: 'address', name: 'creator' },
  { type: 'uint256', name: 'creation_time' },
  { type: 'address', name: 'token_address' },
  { type: 'uint256', name: 'packet_number' },
  { type: 'uint256', name: 'duration' },
  { type: 'uint256[]', name: 'token_ids' },
]

const claim_success_encode = 'ClaimSuccess(bytes32,address,uint256,address)'
const claim_success_types = [
  { type: 'bytes32', name: 'id' },
  { type: 'address', name: 'claimer' },
  { type: 'uint256', name: 'claimed_token_id' },
  { type: 'address', name: 'token_address' },
]

const refund_success_encode = 'RefundSuccess(bytes32,address,uint256,uint256[])'
const refund_success_types = [
  { type: 'bytes32', name: 'id' },
  { type: 'address', name: 'token_address' },
  { type: 'uint256', name: 'remaining_balance' },
  { type: 'uint256[]', name: 'remaining_token_ids' },
]

module.exports = {
  creation_success_encode,
  creation_success_types,
  claim_success_encode,
  claim_success_types,
  refund_success_encode,
  refund_success_types,
  public_key,
  private_key,
}
