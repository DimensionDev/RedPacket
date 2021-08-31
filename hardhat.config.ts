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
    HardhatNetworkConfig,
    HardhatSolidityConfig,
    HardhatGasReporterConfig,
} = require('./SmartContractProjectConfig/config.js');

const networks = HardhatNetworkConfig;
const solidity = HardhatSolidityConfig;
const gasReporter = HardhatGasReporterConfig;

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
    gasReporter,
};
