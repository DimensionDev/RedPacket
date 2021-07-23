import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers, upgrades } from 'hardhat'

type MyMapLikeType = Record<string, string>
const deployedContracts: MyMapLikeType = {
  mainnet: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  ropsten: '0xa1CFdE922df9A950875545F0055b389d09f53263',
  rinkeby: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  bsc_test: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  bsc_mainnet: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  matic_mumbai_test: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  matic_mainnet: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  arbitrum: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  arbitrum_rinkeby: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
}

const func: DeployFunction = async function(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const network: string = hre.hardhatArguments.network ? hre.hardhatArguments.network : 'ropsten'
  const proxyAddress = deployedContracts[network]

  if (true) {
    // deploy, we normally do this only once
    const HappyRedPacketImpl_erc721 = await ethers.getContractFactory('HappyRedPacket_ERC721')
    const HappyRedPacketProxy_erc721 = await upgrades.deployProxy(HappyRedPacketImpl_erc721, [])
    await HappyRedPacketProxy_erc721.deployed()
    console.log('HappyRedPacketProxy_erc721: ' + HappyRedPacketProxy_erc721.address)
  } else {
    // upgrade contract
    const HappyRedPacketImpl = await ethers.getContractFactory('HappyRedPacket_ERC721')
    await upgrades.upgradeProxy(proxyAddress, HappyRedPacketImpl)
  }
}

func.tags = ['HappyRedPacket_ERC721']

module.exports = func
