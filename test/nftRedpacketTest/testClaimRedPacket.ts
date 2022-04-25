import { ethers, waffle } from "hardhat";
import { Signer, utils, BigNumber } from "ethers";
import { takeSnapshot, revertToSnapShot, advanceTimeAndBlock } from "../helper";
import { nftCreationParams, getRevertMsg, createClaimParam } from "../constants";
import { range, difference, first } from "lodash";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
const { expect } = chai;
const { deployContract } = waffle;
chai.use(chaiAsPromised);

import RedPacket721Artifact from "../../artifacts/contracts/redpacket_erc721.sol/HappyRedPacket_ERC721.json";
import { HappyRedPacket_ERC721 } from "../../types/contracts/redpacket_erc721.sol/HappyRedPacket_ERC721";
import TestTokenArtifact from "../../artifacts/contracts/test_token_erc721.sol/TestToken_721.json";
import { TestToken_721 } from "../../types/contracts/test_token_erc721.sol/TestToken_721";

describe("Test claim nft redpacket", () => {
  let redpacket: HappyRedPacket_ERC721;
  let testToken: TestToken_721;
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

    const amount = BigNumber.from("260");
    redpacket = (await deployContract(contractCreator, RedPacket721Artifact)) as HappyRedPacket_ERC721;
    testToken = (await deployContract(packetCreator, TestTokenArtifact, [amount])) as TestToken_721;
    nftCreationParams.tokenAddr = testToken.address;
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
    await testToken.connect(packetCreator).setApprovalForAll(redpacket.address, true);
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
  });

  //#region claim() test
  it("Should throw error when redpacket id does not exist", async () => {
    const claimParams = await createClaimParam(
      utils.hexlify(utils.toUtf8Bytes("not exist")),
      signerAddresses[2],
      signerAddresses[2],
    );
    await expect(redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams))).to.be.rejectedWith(Error);
  });

  it("Should throw error when the nft is transferred to others before claim", async () => {
    let invalidParam = Object.assign({}, nftCreationParams);
    invalidParam.erc721TokenIds = [6];
    const pktId = await createRedPacket(invalidParam);
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await testToken.connect(packetCreator).transferFrom(signerAddresses[1], signerAddresses[3], 6);
    await expect(redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams))).to.be.revertedWith(
      getRevertMsg("No available token remain"),
    );
  });

  it("Should throw error when expired", async () => {
    let invalidParam = Object.assign({}, nftCreationParams);
    invalidParam.duration = 0;
    const pktId = await createRedPacket(invalidParam);
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await expect(redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams))).to.be.revertedWith(
      getRevertMsg("Expired"),
    );
  });

  it("Should throw error when out of stock", async () => {
    let invalidParam = Object.assign({}, nftCreationParams);
    invalidParam.erc721TokenIds = [30];
    const pktId = await createRedPacket(invalidParam);
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    const anotherClaim = await createClaimParam(pktId, signerAddresses[3], signerAddresses[3]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
    await expect(redpacket.connect(signers[3]).claim.apply(null, Object.values(anotherClaim))).to.be.revertedWith(
      getRevertMsg("No available token remain"),
    );
  });

  it("Should throw error when password is wrong", async () => {
    const pktId = await createRedPacket(nftCreationParams);
    const testWallet = ethers.Wallet.createRandom();
    var wrongSignedMsg = await testWallet.signMessage(utils.arrayify(signerAddresses[2]));
    const claimParam = {
      pktId,
      wrongSignedMsg,
      caller: signerAddresses[2],
    };
    await expect(redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParam))).to.be.revertedWith(
      getRevertMsg("verification failed"),
    );
  });

  it("Should throw error when cheater use replay", async () => {
    const pktId = await createRedPacket(nftCreationParams);
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await expect(redpacket.connect(signers[3]).claim.apply(null, Object.values(claimParams))).to.be.revertedWith(
      getRevertMsg("verification failed"),
    );
  });

  it("Should throw error when already claimed", async () => {
    let invalidParam = Object.assign({}, nftCreationParams);
    invalidParam.erc721TokenIds = [40, 41, 42];
    const pktId = await createRedPacket(invalidParam);
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
    await expect(redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams))).to.be.revertedWith(
      getRevertMsg("Already claimed"),
    );
  });

  it("Should emit ClaimSuccess when part of the nft is transferred to others before claim", async () => {
    let creationParam = Object.assign({}, nftCreationParams);
    creationParam.erc721TokenIds = [7, 8, 9];
    const pktId = await createRedPacket(creationParam);
    for (const i of [7, 8]) {
      await testToken.connect(packetCreator).transferFrom(signerAddresses[1], signerAddresses[3], i);
    }
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
    const claimedSuccessEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimSuccess = first(claimedSuccessEvents);
    expect(claimSuccess.args).to.have.property("id").that.to.be.not.null;

    const claimedId = claimSuccess.args.claimed_token_id;
    expect(claimedId).to.be.eq(BigNumber.from("9"));
    const currentOwner = await testToken.ownerOf(claimedId);
    expect(currentOwner).to.be.eq(signerAddresses[2]);

    const pktInfo = await redpacket.connect(signers[2]).check_availability(pktId);
    const calculatedClaimNumber = countSetBits(pktInfo.bit_status.toNumber());
    expect(pktInfo.balance).to.be.eq(3 - calculatedClaimNumber);
  });

  it("Should emit ClaimSuccess when everything is OK", async () => {
    let creationParam = Object.assign({}, nftCreationParams);
    creationParam.erc721TokenIds = [3, 4, 5];
    const pktId = await createRedPacket(creationParam);
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
    const claimedSuccessEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimSuccess = first(claimedSuccessEvents);
    expect(claimSuccess.args).to.have.property("id").that.to.be.not.null;

    const claimedId = claimSuccess.args.claimed_token_id;
    const currentOwner = await testToken.ownerOf(claimedId);
    expect(currentOwner).to.be.eq(signerAddresses[2]);

    const pktInfo = await redpacket.connect(signers[2]).check_availability(pktId);
    expect(pktInfo.balance).to.be.eq(2);
  });

  it("Should create and claim successfully with 100 red packets and 100 claimers", async () => {
    await testSuitCreateAndClaimManyRedPackets(range(100, 200), 100);
    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimedIds = claimEvents.map((event) => event.args.claimed_token_id.toNumber());
    const mismatchedTokenIds = difference(range(100, 200), claimedIds);
    expect(mismatchedTokenIds.length).to.be.eq(0);
  });
  //#endregion

  //#region check_claimed_id() test
  it("Should return claimed id when everything is OK", async () => {
    let creationParam = Object.assign({}, nftCreationParams);
    creationParam.erc721TokenIds = [13, 14, 15];
    const pktId = await createRedPacket(creationParam);
    const claimParam = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParam));
    const claimedId = await redpacket.connect(signers[2]).check_claimed_id(pktId);
    expect(claimedId.toNumber()).to.be.gte(13).and.to.be.lte(15);
  });

  it("Should return claimed id when everything is OK (after expire)", async () => {
    let creationParam = Object.assign({}, nftCreationParams);
    creationParam.erc721TokenIds = [201, 202, 203];
    const pktId = await createRedPacket(creationParam);
    const claimParam = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParam));
    const claimedSuccessEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimSuccess = first(claimedSuccessEvents);
    const loggedClaimedId = claimSuccess.args.claimed_token_id;

    await advanceTimeAndBlock(2000);

    const claimedId = await redpacket.connect(signers[2]).check_claimed_id(pktId);
    expect(claimedId.toNumber()).to.be.gte(201).and.to.be.lte(203);
    expect(claimedId).to.be.eq(loggedClaimedId);
  });
  //#endregion

  //#region check_erc721_remain_ids() test
  it("Should return remained id when everything is OK", async () => {
    let creationParam = Object.assign({}, nftCreationParams);
    creationParam.erc721TokenIds = [16, 17, 18];
    const pktId = await createRedPacket(creationParam);
    const claimParam = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParam));
    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimedIds = claimEvents.map((event) => event.args.claimed_token_id.toNumber());
    expect(claimedIds.length).to.be.eq(1);
    const claimedId = await redpacket.connect(signers[2]).check_claimed_id(pktId);
    const remainIds = await redpacket.check_erc721_remain_ids(pktId);
    const claimedIndex = creationParam.erc721TokenIds.indexOf(claimedId.toNumber());
    const isSet = (remainIds.bit_status.toNumber() & (1 << claimedIndex)) != 0;
    expect(isSet).to.be.true;
  });

  it("Should return remained id when everything is OK (after expire)", async () => {
    let creationParam = Object.assign({}, nftCreationParams);
    creationParam.erc721TokenIds = [204, 205, 206];
    const pktId = await createRedPacket(creationParam);
    const claimParam = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParam));
    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimedIds = claimEvents.map((event) => event.args.claimed_token_id.toNumber());
    expect(claimedIds.length).to.be.eq(1);
    const claimedId = await redpacket.connect(signers[2]).check_claimed_id(pktId);

    await advanceTimeAndBlock(2000);

    const remainIds = await redpacket.check_erc721_remain_ids(pktId);
    const claimedIndex = creationParam.erc721TokenIds.indexOf(claimedId.toNumber());
    const isSet = (remainIds.bit_status.toNumber() & (1 << claimedIndex)) != 0;
    expect(isSet).to.be.eq(true);
  });
  //#endregion

  function countSetBits(n: number) {
    var count = 0;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }

  async function testSuitCreateAndClaimManyRedPackets(tokenList: number[], claimers: number) {
    let creationParam = Object.assign({}, nftCreationParams);
    creationParam.erc721TokenIds = tokenList;
    const pktId = await createRedPacket(creationParam);
    await Promise.all(
      range(claimers).map(async (i) => {
        const claimParams = await createClaimParam(pktId, signerAddresses[i], signerAddresses[i]);
        claimParams["txParameter"] = {
          gasLimit: 6000000,
        };
        await redpacket.connect(signers[i]).claim.apply(null, Object.values(claimParams));
      }),
    );
  }

  async function createRedPacket(creationParams: any): Promise<string> {
    await redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(creationParams));
    const createSuccessEvents = await redpacket.queryFilter(redpacket.filters.CreationSuccess());
    const createdSuccess = first(createSuccessEvents);
    return createdSuccess.args.id;
  }
});
