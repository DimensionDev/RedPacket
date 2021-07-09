import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers, upgrades } from 'hardhat'

type MyMapLikeType = Record<string, string>
const deployedContracts: MyMapLikeType = {
  mainnet: '0x7323ec104a689480dEbE8Eb1404FB0f9D425D2ca',
  ropsten: '0x52a80151dDF3E1AffE6537c5f56191dD2d97c46C',
  rinkeby: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  bsc_test: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  bsc_mainnet: '0x3EB4C32bB45ca9b6160476a2e839190BD60FA623',
  matic_mumbai_test: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  matic_mainnet: '0xCCf182182376730c2c23Edc815bBdc714e91741c',
  arbitrum_rinkeby: '0x6B70EC653c4331bdD0D0DCC7C941eb594e69a91d',
}

const func: DeployFunction = async function(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  await deploy('HappyRedPacket', {
    from: deployer,
    args: [],
    log: true,
  })

  const network: string = hre.hardhatArguments.network ? hre.hardhatArguments.network : 'ropsten'
  const proxyAddress = deployedContracts[network]

  if (false) {
    // deploy, we normally do this only once
    const HappyRedPacketImpl = await ethers.getContractFactory('HappyRedPacket')
    const HappyRedPacketProxy = await upgrades.deployProxy(HappyRedPacketImpl, [])
    await HappyRedPacketProxy.deployed()
    console.log('HappyRedPacketProxy: ' + HappyRedPacketProxy.address)
  } else {
    // upgrade contract
    const HappyRedPacketImpl = await ethers.getContractFactory('HappyRedPacket')
    await upgrades.upgradeProxy(proxyAddress, HappyRedPacketImpl)
  }
}

func.tags = ['HappyRedPacket']

module.exports = func
