import { ethers } from 'ethers'
const chai = require('chai')
const expect = chai.expect;
const assert = chai.assert
import 'hardhat-deploy'
import 'hardhat-deploy-ethers'
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-ethers"
import "solidity-coverage"
import '@openzeppelin/hardhat-upgrades'
import "@nomiclabs/hardhat-truffle5"
import "hardhat-gas-reporter"

const {
     infura_project_id,
     private_key_list,
} = require('./project.secret');

const networks = {
     localhost: {
          url: "http://127.0.0.1:8545",
          chainId: 1337,
     },
     hardhat: {
          blockGasLimit: 8000000,
          chainId: 31337,
          gas: 'auto',
          accounts: {
               count: 100,  
          }
     },
     mainnet: {
          url: 'https://mainnet.infura.io/v3/' + infura_project_id,
          accounts: private_key_list,
          chainId: 1,
          gasPrice: ethers.utils.parseUnits('25', 'gwei').toNumber(),
          // blockGasLimit 8000000
          // to solve timeout error, increase the hardcoded `waitAndValidateDeployment` in `@openzeppelin/upgrades-core/dist/deployment.js`
          // timeout: 600000,
      },
     ropsten: {
          url: 'https://ropsten.infura.io/v3/' + infura_project_id,
          accounts: private_key_list,
          chainId: 3,
          // 10gwei make test faster
          gasPrice: ethers.utils.parseUnits('10', 'gwei').toNumber(),
          // blockGasLimit 8000000
     },
     rinkeby: {
          url: "https://rinkeby.infura.io/v3/" + infura_project_id,
          accounts: private_key_list,
          chainId: 4,
          gasPrice: ethers.utils.parseUnits('5', 'gwei').toNumber(),
          // blockGasLimit 8000000
      },
     bsc_test: {
          url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
          accounts: private_key_list,
          chainId: 97,
          // 25 Gwei, if too low, we would see "ProviderError: transaction underpriced"
          gasPrice: ethers.utils.parseUnits('25', 'gwei').toNumber(),
          // blockGasLimit 8000000
     },
     // BSC mainnet not tested yet, not sure if it works
     bsc_mainnet: {
          url: 'https://bsc-dataseed1.binance.org:443',
          accounts: private_key_list,
          chainId: 56,
          // 5 Gwei
          gasPrice: ethers.utils.parseUnits('5', 'gwei').toNumber(),
          // blockGasLimit 8000000
     },
     matic_mumbai_test: {
          url: 'https://rpc-mumbai.matic.today',
          accounts: private_key_list,
          chainId: 80001,
          gasPrice: ethers.utils.parseUnits('2', 'gwei').toNumber(),
          // blockGasLimit 8000000
     },
     matic_mainnet: {
          url: 'https://rpc-mainnet.matic.network',
          accounts: private_key_list,
          chainId: 137,
          gasPrice: ethers.utils.parseUnits('2.5', 'gwei').toNumber(),
          // blockGasLimit 8000000
     },
     arbitrum: {
          url: 'https://arb1.arbitrum.io/rpc',
          accounts: private_key_list,
          chainId: 42161,
          gasPrice: ethers.utils.parseUnits('0.4', 'gwei').toNumber(),
      },
     arbitrum_rinkeby: {
        url: 'https://rinkeby.arbitrum.io/rpc',
        accounts: private_key_list,
        chainId: 421611,
        gasPrice: ethers.utils.parseUnits('10', 'gwei').toNumber(),
    },
};

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
     networks,
     mocha: {
          timeout: 500000
     },
     solidity: {
          version: "0.8.0",
          settings: {
               optimizer: {
                    enabled: true,
                    runs: 200
               }
          }
     },
     namedAccounts: {
          deployer: {
               default: 0,
          },
     },
};
