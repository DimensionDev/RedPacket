import { ethers } from 'ethers'
const chai = require('chai')
const expect = chai.expect;
const assert = chai.assert
import 'hardhat-deploy'
import 'hardhat-deploy-ethers'
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-ethers"
import "solidity-coverage"
import "hardhat-gas-reporter"
import '@openzeppelin/hardhat-upgrades'
import "@nomiclabs/hardhat-truffle5"
import "@nomiclabs/hardhat-etherscan";
import "hardhat-abi-exporter";

const {
  HardhatNetworkConfig,
  HardhatSolidityConfig,
  HardhatGasReporterConfig,
  EtherscanConfig,
} = require('./SmartContractProjectConfig/config.js');

const networks = HardhatNetworkConfig;
const solidity = HardhatSolidityConfig;
const gasReporter = HardhatGasReporterConfig;
const etherscan = EtherscanConfig;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks,
  mocha: {
    timeout: 500000,
  },
  solidity,
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  etherscan,
  gasReporter,
  abiExporter: {
    path: './abi',
    runOnCompile: true,
    flat: true,
    only: [
      'HappyRedPacket',
      'HappyRedPacket_ERC721'
    ],
  },
};
