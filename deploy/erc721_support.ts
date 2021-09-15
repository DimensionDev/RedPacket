import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers, upgrades } from 'hardhat'

type MyMapLikeType = Record<string, string>
const deployedContracts: MyMapLikeType = {
  // mainnet: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  // ropsten: '0xcA6589d246355EaFBE424De335fd937Dcbd619A2',
  // rinkeby: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  // bsc_test: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  // bsc_mainnet: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  // matic_mumbai_test: '0xF8a45d2F1a4d13Cd82ffeDd8c7747a15D0309571',
  // matic_mainnet: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  // arbitrum: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  // arbitrum_rinkeby: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  mainnet: '0xaBBe1101FD8fa5847c452A6D70C8655532B03C33',
  ropsten: '0x0722507c3b776A6B205946592016e358B0D34c3F',
  bsc_mainnet: '0x0ca42C178e14c618c81B8438043F27d9D38145f6',
  matic_mainnet: '0x93e0b87A0aD0C991dc1B5176ddCD850c9a78aabb',
  arbitrum: '0x83D6b366f21e413f214EB077D5378478e71a5eD2',
  arbitrum_rinkeby: '0x4A77E797031257db72F7D2C3Ec08a4FAc5c8CfE9',
  xdai: '0x54a0A221C25Fc0a347EC929cFC5db0be17fA2a2B',
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
