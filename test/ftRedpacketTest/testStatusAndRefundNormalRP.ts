import { use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { BigNumber, Signer, utils } from "ethers";
import { ethers, waffle } from "hardhat";
import { first, times } from "lodash";
import { BNSum, createClaimParam, creationParams, FtCreationParamType } from "../constants";
import { advanceTimeAndBlock, revertToSnapShot, takeSnapshot } from "../helper";
const { expect } = use(chaiAsPromised);
const { deployContract } = waffle;

import BurnTokenArtifact from "../../artifacts/contracts/burn_token.sol/BurnToken.json";
import RedpacketArtifact from "../../artifacts/contracts/redpacket.sol/HappyRedPacket.json";
import TestTokenArtifact from "../../artifacts/contracts/test_token.sol/TestToken.json";
import { BurnToken } from "../../types/contracts/burn_token.sol/BurnToken";
import { CreationSuccessEvent, HappyRedPacket } from "../../types/contracts/redpacket.sol/HappyRedPacket";
import { TestToken } from "../../types/contracts/test_token.sol/TestToken";

describe("Test redpacket refund and status check function for FT tokens", () => {
  let redpacket: HappyRedPacket;
  let testToken: TestToken;
  let burnToken: BurnToken;
  let signers: Signer[];
  let signerAddresses: string[];
  let contractCreator: Signer;
  let packetCreator: Signer;
  let snapshotId: string;
  let erc20CreationParams: FtCreationParamType;

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

    erc20CreationParams = {
      ...creationParams,
      tokenType: 1,
      totalTokens: 20,
      number: 5,
      tokenAddr: testToken.address,
    };
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
  });

  describe("Redpacket status check function test", () => {
    it("Should return availability status when everything is ok", async () => {
      const createSuccess = await createRedpacket(0, creationParams);
      if (!createSuccess) throw "No CreationSuccess Emitted";
      const pktId = createSuccess.args.id;
      const redpacketInfo = await redpacket.check_availability(pktId);
      expect(redpacketInfo.claimed_amount.toString()).to.be.eq("0");
      expect(redpacketInfo.balance.toNumber()).to.be.eq(creationParams.totalTokens);
      expect(redpacketInfo.expired).to.be.false;
      expect(redpacketInfo.total.toNumber()).to.be.eq(creationParams.number);
    });

    it("Should return red packet info after expired", async () => {
      const createSuccess = await createRedpacket(0, creationParams);
      if (!createSuccess) throw "No CreationSuccess Emitted";
      const pktId = createSuccess.args.id;
      const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
      await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
      const claimSuccessEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
      const claimSuccessEvent = first(claimSuccessEvents);
      if (!claimSuccessEvent) throw "No ClaimSuccess Emitted";
      const claimedValue = claimSuccessEvent.args.claimed_value;
      const remain = BigNumber.from(creationParams.totalTokens).sub(claimedValue);

      await advanceTimeAndBlock(2000);
      const redpacketInfo = await redpacket.connect(signers[2]).check_availability(pktId);
      expect(redpacketInfo.claimed.toString()).to.be.eq("1");
      expect(redpacketInfo.token_address).to.be.eq(`0x${"0".repeat(40)}`);
      expect(redpacketInfo.total.toString()).to.be.eq("3");
      expect(redpacketInfo.claimed_amount).to.be.eq(claimedValue);
      expect(redpacketInfo.balance).to.be.eq(remain);
      expect(redpacketInfo.expired).to.be.true;
    });

    it("Should return red packet info after expired (erc20)", async () => {
      const createSuccess = await createRedpacket(1, erc20CreationParams);
      if (!createSuccess) throw "No CreationSuccess Emitted";
      const pktId = createSuccess.args.id;
      const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
      await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
      const claimSuccessEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
      const claimSuccessEvent = first(claimSuccessEvents);
      if (!claimSuccessEvent) throw "No ClaimSuccess Emitted";
      const claimedValue = claimSuccessEvent.args.claimed_value;
      const remain = BigNumber.from(erc20CreationParams.totalTokens).sub(claimedValue);

      await advanceTimeAndBlock(2000);
      const redpacketInfo = await redpacket.connect(signers[2]).check_availability(pktId);
      expect(redpacketInfo.claimed.toString()).to.be.eq("1");
      expect(redpacketInfo.token_address).to.be.eq(testToken.address);
      expect(redpacketInfo.total.toString()).to.be.eq("5");
      expect(redpacketInfo.claimed_amount).to.be.eq(claimedValue);
      expect(redpacketInfo.balance).to.be.eq(remain);
      expect(redpacketInfo.expired).to.be.true;
    });

    it("Should return red packet info after refund", async () => {
      const createSuccess = await createRedpacket(0, creationParams);
      if (!createSuccess) throw "No CreationSuccess Emitted";
      const pktId = createSuccess.args.id;
      const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
      await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
      const claimSuccessEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
      const claimSuccessEvent = first(claimSuccessEvents);
      if (!claimSuccessEvent) throw "No ClaimSuccess Emitted";
      const claimedValue = claimSuccessEvent.args.claimed_value;
      await advanceTimeAndBlock(2000);

      await redpacket.connect(packetCreator).refund(pktId);
      const redpacketInfo = await redpacket.connect(signers[2]).check_availability(pktId);
      expect(redpacketInfo.claimed.toString()).to.be.eq("1");
      expect(redpacketInfo.token_address).to.be.eq(`0x${"0".repeat(40)}`);
      expect(redpacketInfo.total.toString()).to.be.eq("3");
      expect(redpacketInfo.claimed_amount).to.be.eq(claimedValue);
      expect(redpacketInfo.balance.toNumber()).to.be.eq(0);
      expect(redpacketInfo.expired).to.be.true;
    });

    it("Should return red packet info after refund (erc20)", async () => {
      const createSuccess = await createRedpacket(1, erc20CreationParams);
      if (!createSuccess) throw "No CreationSuccess Emitted";
      const pktId = createSuccess.args.id;
      const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
      await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
      const claimSuccessEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
      const claimSuccessEvent = first(claimSuccessEvents);
      if (!claimSuccessEvent) throw "No ClaimSuccess Emitted";
      const claimedValue = claimSuccessEvent.args.claimed_value;
      await advanceTimeAndBlock(2000);

      await redpacket.connect(packetCreator).refund(pktId);
      const redpacketInfo = await redpacket.connect(signers[2]).check_availability(pktId);
      expect(redpacketInfo.claimed.toString()).to.be.eq("1");
      expect(redpacketInfo.token_address).to.be.eq(testToken.address);
      expect(redpacketInfo.total.toString()).to.be.eq("5");
      expect(redpacketInfo.claimed_amount).to.be.eq(claimedValue);
      expect(redpacketInfo.balance.toNumber()).to.be.eq(0);
      expect(redpacketInfo.expired).to.be.true;
    });
  });

  describe("Redpacket refund function test", () => {
    it("Should refund eth successfully", async () => {
      const createSuccess = await createRedpacket(0, creationParams);
      if (!createSuccess) throw "No CreationSuccess Emitted";
      const pktId = createSuccess.args.id;
      const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
      await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
      const claimSuccessEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
      const claimSuccessEvent = first(claimSuccessEvents);
      if (!claimSuccessEvent) throw "No ClaimSuccess Emitted";
      const claimedValue = claimSuccessEvent.args.claimed_value;
      const remain = creationParams.totalTokens - claimedValue.toNumber();
      await advanceTimeAndBlock(2000);

      await redpacket.connect(packetCreator).refund(pktId);
      const refundSuccessEvents = await redpacket.queryFilter(redpacket.filters.RefundSuccess());
      const refundSuccessEvent = first(refundSuccessEvents);
      if (!refundSuccessEvent) throw "No RefundSuccess Emitted";
      expect(refundSuccessEvent.args).to.have.property("id");
      expect(refundSuccessEvent.args.token_address).to.be.eq(`0x${"0".repeat(40)}`);
      expect(refundSuccessEvent.args.remaining_balance.toNumber()).to.be.eq(remain);
    });

    it("Should refund erc20 successfully", async () => {
      const createSuccess = await createRedpacket(1, erc20CreationParams);
      if (!createSuccess) throw "No CreationSuccess Emitted";
      const pktId = createSuccess.args.id;
      const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
      await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
      const claimSuccessEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
      const claimSuccessEvent = first(claimSuccessEvents);
      if (!claimSuccessEvent) throw "No ClaimSuccess Emitted";
      const claimedValue = claimSuccessEvent.args.claimed_value;
      const remain = BigNumber.from("20").sub(claimedValue);
      await advanceTimeAndBlock(2000);

      const balanceBeforeRefund = await testToken.balanceOf(signerAddresses[1]);
      await redpacket.connect(packetCreator).refund(pktId);
      const balanceAfterRefund = await testToken.balanceOf(signerAddresses[1]);
      expect(remain.add(balanceBeforeRefund)).to.be.eq(balanceAfterRefund);

      const refundSuccessEvents = await redpacket.queryFilter(redpacket.filters.RefundSuccess());
      const refundSuccessEvent = first(refundSuccessEvents);
      if (!refundSuccessEvent) throw "No RefundSuccess Emitted";
      expect(refundSuccessEvent.args).to.have.property("id");
      expect(refundSuccessEvent.args.token_address).to.be.eq(testToken.address);
      expect(refundSuccessEvent.args.remaining_balance).to.be.eq(remain);
    });

    it("Should refund eth successfully (not random)", async () => {
      const avgCreationParam = {
        ...creationParams,
        ifrandom: false,
      };
      const createSuccess = await createRedpacket(0, avgCreationParam);
      if (!createSuccess) throw "No CreationSuccess Emitted";
      const pktId = createSuccess.args.id;
      const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
      await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
      await advanceTimeAndBlock(2000);

      await redpacket.connect(packetCreator).refund(pktId);
      const refundSuccessEvents = await redpacket.queryFilter(redpacket.filters.RefundSuccess());
      const refundSuccessEvent = first(refundSuccessEvents);
      if (!refundSuccessEvent) throw "No RefundSuccess Emitted";
      expect(refundSuccessEvent.args).to.have.property("id");
      expect(refundSuccessEvent.args.token_address).to.be.eq(`0x${"0".repeat(40)}`);
      expect(refundSuccessEvent.args.remaining_balance.toNumber()).to.be.eq(66666667);
    });

    it("Should refund erc20 successfully when there're 100 red packets and 50 claimers", async () => {
      const largeScaleCreationParams = {
        ...creationParams,
        totalTokens: 10000,
        number: 100,
        tokenType: 1,
        tokenAddr: testToken.address,
      };
      const pktId = await testSuitCreateAndClaimManyRedPackets(50, largeScaleCreationParams);
      const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
      const claimedValues = claimEvents.map((event) => event.args.claimed_value);
      const claimedTotal = BNSum(claimedValues);
      const remain = BigNumber.from("10000").sub(claimedTotal);

      await advanceTimeAndBlock(2000);
      const balanceBeforeRefund = await testToken.balanceOf(signerAddresses[1]);
      await redpacket.connect(packetCreator).refund(pktId);
      const balanceAfterRefund = await testToken.balanceOf(signerAddresses[1]);
      const refundSuccessEvents = await redpacket.queryFilter(redpacket.filters.RefundSuccess());
      const refundSuccessEvent = first(refundSuccessEvents);
      if (!refundSuccessEvent) throw "No RefundSuccess Emitted";
      expect(refundSuccessEvent.args).to.have.property("id");
      expect(refundSuccessEvent.args.token_address).to.be.eq(testToken.address);
      expect(refundSuccessEvent.args.remaining_balance).to.be.eq(remain);
      expect(balanceAfterRefund.eq(remain.add(balanceBeforeRefund))).to.be.true;
    });
  });

  async function testSuitCreateAndClaimManyRedPackets(
    claimers: number,
    largeScaleCreationParams: any,
  ): Promise<string> {
    const createSuccess = await createRedpacket(1, largeScaleCreationParams);
    if (!createSuccess) throw "No CreationSuccess Emitted";
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

    return pktId;
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
