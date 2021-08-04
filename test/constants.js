const Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
var account = web3.eth.accounts.create();
var private_key = account.privateKey;
var public_key = account.address;

const creation_success_encode =
  'CreationSuccess(uint,bytes32,string,string,address,uint,address,uint,bool,uint)'
const creation_success_types = [
  { type: 'uint', name: 'total' },
  { type: 'bytes32', name: 'id' },
  { type: 'string', name: 'name' },
  { type: 'string', name: 'message' },
  { type: 'address', name: 'creator' },
  { type: 'uint', name: 'creation_time' },
  { type: 'address', name: 'token_address' },
  { type: 'uint', name: 'number' },
  { type: 'bool', name: 'ifrandom' },
  { type: 'uint', name: 'duration' },
]
const claim_success_encode = 'ClaimSuccess(bytes32,address,uint,address)'
const claim_success_types = [
  { type: 'bytes32', name: 'id' },
  { type: 'address', name: 'claimer' },
  { type: 'uint', name: 'claimed_value' },
  { type: 'address', name: 'token_address' },
]
const refund_success_encode = 'RefundSuccess(bytes32,address,uint)'
const refund_success_types = [
  { type: 'bytes32', name: 'id' },
  { type: 'address', name: 'token_address' },
  { type: 'uint', name: 'remaining_balance' },
]
const PASSWORD = 'password'
const eth_address = '0x0000000000000000000000000000000000000000'

module.exports = {
  creation_success_encode,
  creation_success_types,
  claim_success_encode,
  claim_success_types,
  refund_success_encode,
  refund_success_types,
  public_key,
  private_key,
  eth_address,
}