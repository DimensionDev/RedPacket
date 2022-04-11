import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, upgrades } from 'hardhat';
import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";

const ADDRESS_TABLE_PATH = path.resolve(__dirname, "..", "helper_scripts", "contract-addresses.csv");

const func: DeployFunction = async function(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const network: string = hre.hardhatArguments.network ? hre.hardhatArguments.network : 'ropsten'
  const deployedContracts = await loadDeployedAddress();
  const proxyAddress = deployedContracts[network]
  
  if (true) {
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

async function loadDeployedAddress(): Promise<Record<string, string>> {
  const data = await fs.readFile(ADDRESS_TABLE_PATH, "utf-8");
  const columns = ['Chain', 'HappyRedPacket', 'HappyRedPacket_ERC721'];
  const records = parse(data, { delimiter: ',', columns, from: 2 });
  let deployedContract: Record<string, string> = {};
  for (const { Chain, HappyRedPacket } of records) {
    deployedContract[Chain.toLowerCase()] = HappyRedPacket;
  }
  return deployedContract;
}

func.tags = ['HappyRedPacket']

module.exports = func
