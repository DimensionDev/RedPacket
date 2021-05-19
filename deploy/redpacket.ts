import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const func: DeployFunction = async function(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  await deploy('HappyRedPacket', {
    from: deployer,
    args: [],
    log: true,
  })
}

func.tags = ['HappyRedPacket']

module.exports = func
