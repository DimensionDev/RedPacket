import { ethers, waffle } from "hardhat";
import { Signer, utils, BigNumber } from "ethers";
import { takeSnapshot, revertToSnapShot } from "../helper";
import { creationParams, getRevertMsg, createClaimParam } from "../constants";
import * as lodash from "lodash";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
const { expect } = chai;
const { deployContract } = waffle;
chai.use(chaiAsPromised);

import RedpacketArtifact from "../../artifacts/contracts/redpacket.sol/HappyRedPacket.json";
import { HappyRedPacket, CreationSuccessEvent } from "../../types/contracts/redpacket.sol/HappyRedPacket";
import TestTokenArtifact from "../../artifacts/contracts/test_token.sol/TestToken.json";
import { TestToken } from "../../types/contracts/test_token.sol/TestToken";
import BurnTokenArtifact from "../../artifacts/contracts/burn_token.sol/BurnToken.json";
import { BurnToken } from "../../types/contracts/burn_token.sol/BurnToken";

describe("Test claim redpacket function for FT tokens", () => {
  let redpacket: HappyRedPacket;
  let testToken: TestToken;
  let burnToken: BurnToken;
  let signers: Signer[];
  let signerAddresses: string[];
  let contractCreator: Signer;
  let packetCreator: Signer;
  let snapshotId: string;

  before(async () => {
    signers = await ethers.getSigners();
    contractCreator = signers[0];
    packetCreator = signers[1];
    signerAddresses = await Promise.all(
      signers.map(async (signer): Promise<string> => {
        return await signer.getAddress();
      }),
    );
    const amount = BigNumber.from(`1${"0".repeat(27)}`);
    redpacket = (await deployContract(contractCreator, RedpacketArtifact)) as HappyRedPacket;
    testToken = (await deployContract(packetCreator, TestTokenArtifact, [amount])) as TestToken;
    burnToken = (await deployContract(packetCreator, BurnTokenArtifact, [amount])) as BurnToken;
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
  });

  it("Should throw error when redpacket id does not exist", async () => {
    const claimParams = await createClaimParam(
      utils.hexlify(utils.toUtf8Bytes("not exist")),
      signerAddresses[2],
      signerAddresses[2],
    );
    await expect(redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams))).to.be.rejectedWith(Error);
  });

  it("Should throw error when expired", async () => {
    let invalidParam = Object.assign({}, creationParams);
    invalidParam.duration = 0;
    const createSuccess = await createRedpacket(0, invalidParam);
    const pktId = createSuccess.args.id;
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await expect(redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams))).to.be.revertedWith(
      getRevertMsg("Expired"),
    );
  });

  it("Should throw error when out of stock", async () => {
    let invalidParam = Object.assign({}, creationParams);
    invalidParam.number = 1;
    const createSuccess = await createRedpacket(0, invalidParam);
    const pktId = createSuccess.args.id;
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    const anotherParams = await createClaimParam(pktId, signerAddresses[3], signerAddresses[3]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
    await expect(redpacket.connect(signers[3]).claim.apply(null, Object.values(anotherParams))).to.be.revertedWith(
      getRevertMsg("Out of stock"),
    );
  });

  it("Should throw error when password is wrong", async () => {
    const createSuccess = await createRedpacket(0, creationParams);
    const pktId = createSuccess.args.id;
    const wrongClaimParams = await createClaimParam(pktId, signerAddresses[3], signerAddresses[3]);
    await expect(redpacket.connect(signers[2]).claim.apply(null, Object.values(wrongClaimParams))).to.be.revertedWith(
      getRevertMsg("Verification failed"),
    );
  });

  it("Should throw error when already claimed", async () => {
    const createSuccess = await createRedpacket(0, creationParams);
    const pktId = createSuccess.args.id;
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
    await expect(redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams))).to.be.revertedWith(
      getRevertMsg("Already claimed"),
    );
  });

  it("should emit ClaimSuccess when everything is OK", async () => {
    const createSuccess = await createRedpacket(0, creationParams);
    const pktId = createSuccess.args.id;
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
    const claimSuccessEvent = (await redpacket.queryFilter(redpacket.filters.ClaimSuccess()))[0];
    expect(claimSuccessEvent.args).to.have.property("id").to.be.not.null;
  });

  it("Should emit ClaimSuccess when everything is OK (token type: 1)", async () => {
    let erc20CreationParams = Object.assign({}, creationParams);
    erc20CreationParams.tokenType = 1;
    erc20CreationParams.totalTokens = 20;
    erc20CreationParams.number = 5;
    erc20CreationParams.tokenAddr = testToken.address;
    const createSuccess = await createRedpacket(1, erc20CreationParams);
    const pktId = createSuccess.args.id;
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
    const claimSuccessEvent = (await redpacket.queryFilter(redpacket.filters.ClaimSuccess()))[0];
    expect(claimSuccessEvent.args).to.have.property("id").to.be.not.null;
  });

  it("Should BurnToken single-token redpacket work", async () => {
    let burnTokenCreationParams = Object.assign({}, creationParams);
    burnTokenCreationParams.totalTokens = 8;
    burnTokenCreationParams.number = 4;
    burnTokenCreationParams.tokenType = 1;
    burnTokenCreationParams.tokenAddr = burnToken.address;

    const createSuccess = await createRedpacket(2, burnTokenCreationParams);
    const pktId = createSuccess.args.id;
    for (const i of [2, 3, 4, 5]) {
      const claimParam = await createClaimParam(pktId, signerAddresses[i], signerAddresses[i]);
      await redpacket.connect(signers[i]).claim.apply(null, Object.values(claimParam));
    }
  });

  it("Should claim BurnToken work", async () => {
    let burnTokenCreationParams = Object.assign({}, creationParams);
    burnTokenCreationParams.totalTokens = 1000;
    burnTokenCreationParams.number = 4;
    burnTokenCreationParams.tokenType = 1;
    burnTokenCreationParams.tokenAddr = burnToken.address;

    const createSuccess = await createRedpacket(2, burnTokenCreationParams);
    const pktId = createSuccess.args.id;
    for (const i of [2, 3, 4, 5]) {
      const claimParam = await createClaimParam(pktId, signerAddresses[i], signerAddresses[i]);
      await redpacket.connect(signers[i]).claim.apply(null, Object.values(claimParam));
    }

    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimedValues = claimEvents.map((event) => event.args.claimed_value);
    expect(lodash.take(claimedValues, 3).every((v) => v.toString() === claimedValues[3].toString())).to.be.false;
    expect(
      BigNumber.from(burnTokenCreationParams.totalTokens).gt(
        claimedValues[0].add(claimedValues[1]).add(claimedValues[2]).add(claimedValues[3]).toNumber(),
      ),
    ).to.be.true;
  });

  it("Should claim average amount if not set random", async () => {
    let avgCreationParams = Object.assign({}, creationParams);
    avgCreationParams.ifrandom = false;
    avgCreationParams.number = 2;
    const createSuccess = await createRedpacket(0, avgCreationParams);
    const pktId = createSuccess.args.id;
    const claimParams1 = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams1));
    const claimParams2 = await createClaimParam(pktId, signerAddresses[3], signerAddresses[3]);
    await redpacket.connect(signers[3]).claim.apply(null, Object.values(claimParams2));
    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimedValues = claimEvents.map((event) => event.args.claimed_value);
    expect(claimedValues[0].eq(claimedValues[1])).to.be.true;
    expect(claimedValues[0].toNumber()).to.be.eq(avgCreationParams.totalTokens / 2);
  });

  it("Should claim random amount if set random", async () => {
    let randomCreationParams = Object.assign({}, creationParams);
    randomCreationParams.number = 4;
    const createSuccess = await createRedpacket(0, randomCreationParams);
    const pktId = createSuccess.args.id;

    for (const i of [2, 3, 4, 5]) {
      const claimParam = await createClaimParam(pktId, signerAddresses[i], signerAddresses[i]);
      await redpacket.connect(signers[i]).claim.apply(null, Object.values(claimParam));
    }

    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimedValues = claimEvents.map((event) => event.args.claimed_value);
    expect(lodash.take(claimedValues, 3).every((v) => v.toString() === claimedValues[3].toString())).to.be.false;
    expect(
      BigNumber.from(randomCreationParams.totalTokens).eq(
        claimedValues[0].add(claimedValues[1]).add(claimedValues[2]).add(claimedValues[3]).toNumber(),
      ),
    ).to.be.true;
  });

  it("Should claim at least 1 token when random token is 0", async () => {
    let randomCreationParams = Object.assign({}, creationParams);
    randomCreationParams.totalTokens = 3;
    const createSuccess = await createRedpacket(0, randomCreationParams);
    const pktId = createSuccess.args.id;

    for (const i of [2, 3, 4]) {
      const claimParam = await createClaimParam(pktId, signerAddresses[i], signerAddresses[i]);
      await redpacket.connect(signers[i]).claim.apply(null, Object.values(claimParam));
    }

    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimedValues = claimEvents.map((event) => event.args.claimed_value);
    expect(claimedValues.every((v) => v.toString() === "1")).to.be.true;
  });

  //#region large scale test
  it("Should create and claim successfully with 100 red packets and 100 claimers", async () => {
    let largeScaleCreationParams = Object.assign({}, creationParams);
    largeScaleCreationParams.totalTokens = 10000;
    largeScaleCreationParams.number = 100;
    largeScaleCreationParams.tokenType = 1;
    largeScaleCreationParams.tokenAddr = testToken.address;
    largeScaleCreationParams.ifrandom = false;
    await testSuitCreateAndClaimManyRedPackets(100, largeScaleCreationParams);
    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimedValues = claimEvents.map((event) => event.args.claimed_value);
    const claimedTotal = claimedValues.reduce((prev, cur) => prev.add(cur), BigNumber.from("0"));
    expect(claimedTotal.toNumber()).to.be.eq(largeScaleCreationParams.totalTokens);
    expect(claimedValues.every((v) => v.toString() === claimedValues[0].toString())).to.be.true;
  });

  it("Should create and claim successfully with 100 random red packets and 100 claimers", async () => {
    let largeScaleCreationParams = Object.assign({}, creationParams);
    largeScaleCreationParams.totalTokens = 10000;
    largeScaleCreationParams.number = 100;
    largeScaleCreationParams.tokenType = 1;
    largeScaleCreationParams.tokenAddr = testToken.address;
    await testSuitCreateAndClaimManyRedPackets(100, largeScaleCreationParams);
    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimedValues = claimEvents.map((event) => event.args.claimed_value);
    const claimedTotal = claimedValues.reduce((prev, cur) => prev.add(cur), BigNumber.from("0"));
    expect(claimedTotal.toNumber()).to.be.eq(largeScaleCreationParams.totalTokens);
  });
  //#endregion

  async function testSuitCreateAndClaimManyRedPackets(claimers: number, largeScaleCreationParams: any) {
    const createSuccess = await createRedpacket(1, largeScaleCreationParams);
    const pktId = createSuccess.args.id;
    await Promise.all(
      lodash.range(claimers).map(async (i) => {
        const claimParams = await createClaimParam(pktId, signerAddresses[i], signerAddresses[i]);
        claimParams["txParameter"] = {
          gasLimit: 6000000,
        };
        await redpacket.connect(signers[i]).claim.apply(null, Object.values(claimParams));
      }),
    );
  }

  async function createRedpacket(tokenType: number, param: any): Promise<CreationSuccessEvent> {
    if (tokenType == 0) {
      await redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(param));
    } else if (tokenType == 1) {
      await testToken.connect(packetCreator).approve(redpacket.address, param.totalTokens);
      await redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(param));
    } else {
      await burnToken.connect(packetCreator).approve(redpacket.address, param.totalTokens);
      await redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(param));
    }

    return (await redpacket.queryFilter(redpacket.filters.CreationSuccess()))[0];
  }
});
