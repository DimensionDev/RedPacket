import { ethers, waffle } from "hardhat";
import { Signer, utils, BigNumber } from "ethers";
import { takeSnapshot, revertToSnapShot } from "../helper";
import { creationParams, getRevertMsg } from "../constants";
import { use } from "chai";
import chaiAsPromised from "chai-as-promised";
const { expect } = use(chaiAsPromised);
const { deployContract } = waffle;

import RedpacketArtifact from "../../artifacts/contracts/redpacket.sol/HappyRedPacket.json";
import { HappyRedPacket } from "../../types/contracts/redpacket.sol/HappyRedPacket";
import TestTokenArtifact from "../../artifacts/contracts/test_token.sol/TestToken.json";
import { TestToken } from "../../types/contracts/test_token.sol/TestToken";
import BurnTokenArtifact from "../../artifacts/contracts/burn_token.sol/BurnToken.json";
import { BurnToken } from "../../types/contracts/burn_token.sol/BurnToken";

describe("Test Create RedPacket function for Fungible Tokens", () => {
  let redpacket: HappyRedPacket;
  let testToken: TestToken;
  let burnToken: BurnToken;
  let signers: Signer[];
  let contractCreator: Signer;
  let packetCreator: Signer;
  let snapshotId: string;

  before(async () => {
    signers = await ethers.getSigners();
    contractCreator = signers[0];
    packetCreator = signers[1];
    const amount = utils.parseUnits("1.0", 10); // 1e10
    redpacket = (await deployContract(contractCreator, RedpacketArtifact)) as HappyRedPacket;
    testToken = (await deployContract(contractCreator, TestTokenArtifact, [amount])) as TestToken;
    burnToken = (await deployContract(contractCreator, BurnTokenArtifact, [amount])) as BurnToken;
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
  });

  it("Should throw error when expiration_time is greater than 2106", async () => {
    const invalidParams = {
      ...creationParams,
      duration: 2 ** 32,
    };
    await expect(
      redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(invalidParams)),
    ).to.be.revertedWith(getRevertMsg("Value out of range BOX"));
  });

  it("Should throw error when token type is unrecognizable", async () => {
    const invalidParams = {
      ...creationParams,
      tokenType: 4,
    };
    await expect(
      redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(invalidParams)),
    ).to.be.revertedWith(getRevertMsg("Unrecognizable token type"));
  });

  it("Should throw error when total tokens is less than number", async () => {
    const invalidParams = {
      ...creationParams,
      number: 11,
      totalTokens: 10,
    };
    await expect(
      redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(invalidParams)),
    ).to.be.revertedWith(getRevertMsg("#tokens > #packets"));
  });

  it("Should throw error when the received token amount is not enough (ETH)", async () => {
    const invalidParams = {
      ...creationParams,
      number: 10,
      txParameters: {
        gasLimit: BigNumber.from("1000000"),
        value: BigNumber.from("0"),
      },
    };
    await expect(
      redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(invalidParams)),
    ).to.be.revertedWith(getRevertMsg("No enough ETH"));
  });

  it("Should throw error when the received token amount is not enough (burn token)", async () => {
    const invalidParams = {
      ...creationParams,
      tokenType: 1,
      number: 10,
      totalTokens: 10,
      tokenAddr: burnToken.address,
    };
    await burnToken.connect(contractCreator).approve(redpacket.address, invalidParams.totalTokens);

    await expect(
      redpacket.connect(contractCreator).create_red_packet.apply(null, Object.values(invalidParams)),
    ).to.be.revertedWith(getRevertMsg("#received > #packets"));
  });

  it("Should throw error when number is invalid", async () => {
    let invalidParams = {
      ...creationParams,
      number: 0,
    };
    await expect(
      redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(invalidParams)),
    ).to.be.revertedWith(getRevertMsg("At least 1 recipient"));

    invalidParams.number = 256;
    await expect(
      redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(invalidParams)),
    ).to.be.revertedWith(getRevertMsg("At most 255 recipients"));
  });

  it("Should throw error for not enough ERC20 allowance", async () => {
    const invalidParams = {
      ...creationParams,
      tokenType: 1,
      tokenAddr: testToken.address,
    };
    await testToken.connect(contractCreator).approve(redpacket.address, invalidParams.totalTokens - 1);

    await expect(
      redpacket.connect(contractCreator).create_red_packet.apply(null, Object.values(invalidParams)),
    ).to.be.revertedWith("ERC20: insufficient allowance");
  });

  it("Should emit CreationSuccess when everything is ok", async () => {
    await redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(creationParams));
    const creatorAddress = await packetCreator.getAddress();
    const createSuccess = (await redpacket.queryFilter(redpacket.filters.CreationSuccess()))[0];
    const results = createSuccess.args;
    expect(results).to.have.property("total").that.to.be.eq(creationParams.totalTokens.toString());
    expect(results).to.have.property("name").that.to.be.eq(creationParams.name);
    expect(results).to.have.property("message").that.to.be.eq(creationParams.message);
    expect(results).to.have.property("creator").that.to.be.eq(creatorAddress);
    expect(results).to.have.property("creation_time");
    const creationTime = results.creation_time.toString();
    expect(creationTime).to.have.lengthOf(10);
  });
});
