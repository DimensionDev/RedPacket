const Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
/**
 * {
      address: '0x7AD83b14Ce9c7E26Eaac1bc7158ACcca3b676685',
      privateKey: '0x7344567f4e1ad710f4171755d5ddf738b652f236d94fc94f761e19f74ffa4c71',
      signTransaction: [Function: signTransaction],
      sign: [Function: sign],
      encrypt: [Function: encrypt]
    }
    {
      message: '0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2',
      messageHash: '0x54704e80c2d214dfde43ff3712e971b716eb4d546c8f5c924cbaa4ec32e93d47',
      v: '0x1c',
      r: '0x8f198f772da38a0854255961487a17dafeb065686c62b3cd07efcc40d7218a9e',
      s: '0x15615a8cd8c572ff5d38e2c1d4413a9af374d76fb231b09208d0f73064ceb897',
      signature: '0x8f198f772da38a0854255961487a17dafeb065686c62b3cd07efcc40d7218a9e15615a8cd8c572ff5d38e2c1d4413a9af374d76fb231b09208d0f73064ceb8971c'
    }
 */
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