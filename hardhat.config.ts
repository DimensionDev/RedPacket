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
import "@eth-optimism/plugins/hardhat/compiler"

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
          blockGasLimit: 6000000,
          chainId: 31337,
          gas: 'auto',
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
    arbitrum_rinkeby: {
        url: 'https://rinkeby.arbitrum.io/rpc',
        accounts: private_key_list,
        chainId: 421611,
        gasPrice: ethers.utils.parseUnits('10', 'gwei').toNumber(),
    },
    optimism: {
        // https://community.optimism.io/docs/developers/networks.html#optimistic-kovan
        // We currently have a whitelist system in place that limits who can deploy
        // contracts to this network (for security reasons). We know this isn't
        // ideal and we really appreciate your patience
        url: 'https://optimism-mainnet.infura.io/v3/' + infura_project_id,
        accounts: private_key_list,
        chainId: 10,
        gasPrice: ethers.utils.parseUnits('10', 'gwei').toNumber(),
        ovm: true,
    },
    optimism_kovan: {
        url: 'https://optimism-kovan.infura.io/v3/' + infura_project_id,
        accounts: private_key_list,
        chainId: 69,
        // ProviderError: tx.gasPrice must be 15000000
        gasPrice: 15000000,
        ovm: true,
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
          version: "0.7.6",
          settings: {
               optimizer: {
                    enabled: true,
                    runs: 200
               }
          }
     },
     ovm: {
          solcVersion: '0.7.6+commit.3b061308' // Your version goes here.
      },
     namedAccounts: {
          deployer: {
               default: 0,
          },
     },
};
