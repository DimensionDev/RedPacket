import { ethers, waffle } from "hardhat";
import { Signer, utils, BigNumber } from "ethers";
import { takeSnapshot, revertToSnapShot } from "../helper";
import { creationParams, getRevertMsg, createClaimParam, BNSum, FtCreationParamType } from "../constants";
import { take, first, times } from "lodash";
import { use } from "chai";
import chaiAsPromised from "chai-as-promised";
const { expect } = use(chaiAsPromised);
const { deployContract } = waffle;

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
  let erc20CreationParams: FtCreationParamType;
  let burnTokenCreationParams: FtCreationParamType;
  let largeScaleCreationParams: FtCreationParamType;

  before(async () => {
    signers = await ethers.getSigners();
    contractCreator = signers[0];
    packetCreator = signers[1];
    signerAddresses = await Promise.all(
      signers.map(async (signer): Promise<string> => {
        return await signer.getAddress();
      }),
    );

    const amount = utils.parseUnits("1.0", 27); //1e27
    redpacket = (await deployContract(contractCreator, RedpacketArtifact)) as HappyRedPacket;
    testToken = (await deployContract(packetCreator, TestTokenArtifact, [amount])) as TestToken;
    burnToken = (await deployContract(packetCreator, BurnTokenArtifact, [amount])) as BurnToken;

    //CreationParam Initialize
    erc20CreationParams = {
      ...creationParams,
      tokenType: 1,
      totalTokens: 20,
      number: 5,
      tokenAddr: testToken.address,
    };
    burnTokenCreationParams = {
      ...creationParams,
      tokenType: 1,
      number: 4,
      tokenAddr: burnToken.address,
    };
    largeScaleCreationParams = {
      ...creationParams,
      totalTokens: 10000,
      number: 100,
      tokenType: 1,
      tokenAddr: testToken.address,
    };
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
    const invalidParam = {
      ...creationParams,
      duration: 0,
    };
    const createSuccess = await createRedpacket(0, invalidParam);
    if (!createSuccess) throw "No CreationSuccess emitted";
    const pktId = createSuccess.args.id;
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await expect(redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams))).to.be.revertedWith(
      getRevertMsg("Expired"),
    );
  });

  it("Should throw error when out of stock", async () => {
    const invalidParam = {
      ...creationParams,
      number: 1,
    };
    const createSuccess = await createRedpacket(0, invalidParam);
    if (!createSuccess) throw "No CreationSuccess emitted";
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
    if (!createSuccess) throw "No CreationSuccess emitted";
    const pktId = createSuccess.args.id;
    const wrongClaimParams = await createClaimParam(pktId, signerAddresses[3], signerAddresses[3]);
    await expect(redpacket.connect(signers[2]).claim.apply(null, Object.values(wrongClaimParams))).to.be.revertedWith(
      getRevertMsg("Verification failed"),
    );
  });

  it("Should throw error when already claimed", async () => {
    const createSuccess = await createRedpacket(0, creationParams);
    if (!createSuccess) throw "No CreationSuccess emitted";
    const pktId = createSuccess.args.id;
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
    await expect(redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams))).to.be.revertedWith(
      getRevertMsg("Already claimed"),
    );
  });

  it("Should emit ClaimSuccess when everything is OK", async () => {
    const createSuccess = await createRedpacket(0, creationParams);
    if (!createSuccess) throw "No CreationSuccess emitted";
    const pktId = createSuccess.args.id;
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
    const claimSuccessEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimSuccessEvent = first(claimSuccessEvents);
    expect(claimSuccessEvent?.args).to.have.property("id").to.be.not.null;
  });

  it("Should emit ClaimSuccess when everything is OK (token type: 1)", async () => {
    const createSuccess = await createRedpacket(1, erc20CreationParams);
    if (!createSuccess) throw "No CreationSuccess emitted";
    const pktId = createSuccess.args.id;
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
    const claimSuccessEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimSuccessEvent = first(claimSuccessEvents);
    expect(claimSuccessEvent?.args).to.have.property("id").to.be.not.null;
  });

  it("Should BurnToken single-token redpacket work", async () => {
    burnTokenCreationParams.totalTokens = 8;
    const createSuccess = await createRedpacket(2, burnTokenCreationParams);
    if (!createSuccess) throw "No CreationSuccess emitted";
    const pktId = createSuccess.args.id;
    for (const i of [2, 3, 4, 5]) {
      const claimParam = await createClaimParam(pktId, signerAddresses[i], signerAddresses[i]);
      await redpacket.connect(signers[i]).claim.apply(null, Object.values(claimParam));
    }
  });

  it("Should claim BurnToken work", async () => {
    burnTokenCreationParams.totalTokens = 1000;
    const createSuccess = await createRedpacket(2, burnTokenCreationParams);
    if (!createSuccess) throw "No CreationSuccess emitted";
    const pktId = createSuccess.args.id;
    for (const i of [2, 3, 4, 5]) {
      const claimParam = await createClaimParam(pktId, signerAddresses[i], signerAddresses[i]);
      await redpacket.connect(signers[i]).claim.apply(null, Object.values(claimParam));
    }

    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimedValues = claimEvents.map((event) => event.args.claimed_value);
    expect(take(claimedValues, 3).every((v) => v.eq(claimedValues[3]))).to.be.false;
    expect(BigNumber.from(burnTokenCreationParams.totalTokens).gt(BNSum(claimedValues.slice(0.3)))).to.be.true;
  });

  it("Should claim average amount if not set random", async () => {
    const avgCreationParams = {
      ...creationParams,
      ifrandom: false,
      number: 2,
    };
    const createSuccess = await createRedpacket(0, avgCreationParams);
    if (!createSuccess) throw "No CreationSuccess emitted";
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
    const randomCreationParams = {
      ...creationParams,
      number: 4,
    };
    const createSuccess = await createRedpacket(0, randomCreationParams);
    if (!createSuccess) throw "No CreationSuccess emitted";
    const pktId = createSuccess.args.id;

    for (const i of [2, 3, 4, 5]) {
      const claimParam = await createClaimParam(pktId, signerAddresses[i], signerAddresses[i]);
      await redpacket.connect(signers[i]).claim.apply(null, Object.values(claimParam));
    }

    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimedValues = claimEvents.map((event) => event.args.claimed_value);
    expect(take(claimedValues, 3).every((v) => v.eq(claimedValues[3]))).to.be.false;
    expect(
      BigNumber.from(randomCreationParams.totalTokens).eq(
        claimedValues[0].add(claimedValues[1]).add(claimedValues[2]).add(claimedValues[3]).toNumber(),
      ),
    ).to.be.true;
  });

  it("Should claim at least 1 token when random token is 0", async () => {
    const randomCreationParams = {
      ...creationParams,
      totalTokens: 3,
    };
    const createSuccess = await createRedpacket(0, randomCreationParams);
    if (!createSuccess) throw "No CreationSuccess emitted";
    const pktId = createSuccess.args.id;

    for (const i of [2, 3, 4]) {
      const claimParam = await createClaimParam(pktId, signerAddresses[i], signerAddresses[i]);
      await redpacket.connect(signers[i]).claim.apply(null, Object.values(claimParam));
    }

    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimedValues = claimEvents.map((event) => event.args.claimed_value);
    expect(claimedValues.every((v) => v.eq(ethers.constants.One))).to.be.true;
  });

  //#region large scale test
  it("Should create and claim successfully with 100 red packets and 100 claimers", async () => {
    largeScaleCreationParams.ifrandom = false;
    await testSuitCreateAndClaimManyRedPackets(100, largeScaleCreationParams);
    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimedValues = claimEvents.map((event) => event.args.claimed_value);
    const claimedTotal = BNSum(claimedValues);
    expect(claimedTotal.toNumber()).to.be.eq(largeScaleCreationParams.totalTokens);
    expect(claimedValues.every((v) => v.eq(claimedValues[0]))).to.be.true;
  });

  it("Should create and claim successfully with 100 random red packets and 100 claimers", async () => {
    largeScaleCreationParams.ifrandom = true;
    await testSuitCreateAndClaimManyRedPackets(100, largeScaleCreationParams);
    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimedValues = claimEvents.map((event) => event.args.claimed_value);
    const claimedTotal = BNSum(claimedValues);
    expect(claimedTotal.toNumber()).to.be.eq(largeScaleCreationParams.totalTokens);
  });
  //#endregion

  async function testSuitCreateAndClaimManyRedPackets(claimers: number, largeScaleCreationParams: any) {
    const createSuccess = await createRedpacket(1, largeScaleCreationParams);
    if (!createSuccess) throw "No CreationSuccess emitted";
    const pktId = createSuccess.args.id;
    await Promise.all(
      times(claimers, async (index) => {
        const claimParams = await createClaimParam(pktId, signerAddresses[index], signerAddresses[index]);
        claimParams["txParameter"] = {
          gasLimit: 6000000,
        };
        await redpacket.connect(signers[index]).claim.apply(null, Object.values(claimParams));
      }),
    );
  }

  async function createRedpacket(tokenType: number, param: any): Promise<CreationSuccessEvent | undefined> {
    if (tokenType === 0) {
      await redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(param));
    } else if (tokenType === 1) {
      await testToken.connect(packetCreator).approve(redpacket.address, param.totalTokens);
      await redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(param));
    } else {
      await burnToken.connect(packetCreator).approve(redpacket.address, param.totalTokens);
      await redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(param));
    }
    const createSuccessEvents = await redpacket.queryFilter(redpacket.filters.CreationSuccess());
    return first(createSuccessEvents);
  }
});
