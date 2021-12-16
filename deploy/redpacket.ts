import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers, upgrades } from 'hardhat'

type MyMapLikeType = Record<string, string>
const deployedContracts: MyMapLikeType = {
  mainnet: '0xaBBe1101FD8fa5847c452A6D70C8655532B03C33',
  ropsten: '0x0722507c3b776A6B205946592016e358B0D34c3F',
  bsc_mainnet: '0x0ca42C178e14c618c81B8438043F27d9D38145f6',
  matic_mainnet: '0x93e0b87A0aD0C991dc1B5176ddCD850c9a78aabb',
  arbitrum: '0x83D6b366f21e413f214EB077D5378478e71a5eD2',
  arbitrum_rinkeby: '0x4A77E797031257db72F7D2C3Ec08a4FAc5c8CfE9',
  xdai: '0x54a0A221C25Fc0a347EC929cFC5db0be17fA2a2B',
  goerli: '0x8bF6b979286970860Adc75dc621cf1969b0bE66C',
  fantom: '0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98',
  avalanche: '0xF9F7C1496c21bC0180f4B64daBE0754ebFc8A8c0',
  celo: '0x871F2635EeB0bA3D9f90C4524E3f148C31393F9d',
  optimism: '0x981be454a930479d92C91a0092D204b64845A5D6',
  optimism_kovan: '0x68EDbfA3E564C987FaaAB54f4FD1E7567D4151Dd',
  aurora: '0x19f179D7e0D7d9F9d5386afFF64271D98A91615B',
  fuse: '0x561c5f3a19871ecb1273D6D8eCc276BeEDa5c8b4',
  boba: '0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98',
  moonriver: '0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98',
}

const func: DeployFunction = async function(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const network: string = hre.hardhatArguments.network ? hre.hardhatArguments.network : 'ropsten'
  const proxyAddress = deployedContracts[network]

  if (false) {
    // deploy, we normally do this only once
    const HappyRedPacketImpl = await ethers.getContractFactory('HappyRedPacket')
    const HappyRedPacketProxy = await upgrades.deployProxy(HappyRedPacketImpl, [])
    await HappyRedPacketProxy.deployed()
    console.log('HappyRedPacketProxy: ' + HappyRedPacketProxy.address)

    const admin = await upgrades.admin.getInstance();
    const impl_addr = await admin.getProxyImplementation(HappyRedPacketProxy.address);
    await hre.run('verify:verify', {
        address: impl_addr,
        constructorArguments: [],
    });
  } else {
    // upgrade contract
    const HappyRedPacketImpl = await ethers.getContractFactory('HappyRedPacket')
    const instance = await upgrades.upgradeProxy(proxyAddress, HappyRedPacketImpl)

    await instance.deployTransaction.wait();
    const admin = await upgrades.admin.getInstance();
    const impl = await admin.getProxyImplementation(proxyAddress);
    // example: `npx hardhat verify --network rinkeby 0x8974Ce3955eE1306bA89687C558B6fC1E5be777B`
    await hre.run('verify:verify', {
        address: impl,
        constructorArguments: [],
    });
  }
}

func.tags = ['HappyRedPacket']

module.exports = func
