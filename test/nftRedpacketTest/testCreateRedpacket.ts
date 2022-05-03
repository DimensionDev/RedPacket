import { ethers, waffle } from "hardhat";
import { Signer, BigNumber } from "ethers";
import { takeSnapshot, revertToSnapShot } from "../helper";
import { nftCreationParams, getRevertMsg } from "../constants";
import { first, range } from "lodash";
import { use } from "chai";
import chaiAsPromised from "chai-as-promised";
const { expect } = use(chaiAsPromised);
const { deployContract } = waffle;

import RedPacket721Artifact from "../../artifacts/contracts/redpacket_erc721.sol/HappyRedPacket_ERC721.json";
import { HappyRedPacket_ERC721 } from "../../types/contracts/redpacket_erc721.sol/HappyRedPacket_ERC721";
import TestTokenArtifact from "../../artifacts/contracts/test_token_erc721.sol/TestToken_721.json";
import { TestToken_721 } from "../../types/contracts/test_token_erc721.sol/TestToken_721";

describe("Test Create RedPacket function for NFT", () => {
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

  it("Should throw error when token number is less than 1", async () => {
    let invalidParams = Object.assign({}, nftCreationParams);
    invalidParams.erc721TokenIds = [];
    await expect(
      redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(invalidParams)),
    ).to.be.revertedWith(getRevertMsg("At least 1 recipient"));
  });

  it("Should throw error when token number is more than 256", async () => {
    let invalidParams = Object.assign({}, nftCreationParams);
    invalidParams.erc721TokenIds = range(258);
    await expect(
      redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(invalidParams)),
    ).to.be.revertedWith(getRevertMsg("At most 256 recipient"));
  });

  it("Should throw error when the contract is not approved", async () => {
    await testToken.connect(packetCreator).setApprovalForAll(redpacket.address, false);
    await expect(
      redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(nftCreationParams)),
    ).to.be.revertedWith(getRevertMsg("No approved yet"));
  });

  it("Should return false when trying to check ownership with nft ids which doesn't belong to user", async () => {
    await testToken.connect(packetCreator).transferFrom(signerAddresses[1], signerAddresses[3], 20);
    let invalidParams = Object.assign({}, nftCreationParams);
    invalidParams.erc721TokenIds = [20, 21, 22];
    const isOwner = await redpacket
      .connect(packetCreator)
      .check_ownership(invalidParams.erc721TokenIds, testToken.address);
    expect(isOwner).to.be.false;
  });

  it("Should emit CreationSuccess when everything is OK", async () => {
    await redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(nftCreationParams));
    const createSuccess = await redpacket.queryFilter(redpacket.filters.CreationSuccess());
    const result = first(createSuccess).args;
    expect(result.total_tokens.toNumber()).to.be.eq(nftCreationParams.erc721TokenIds.length);
    expect(result).to.have.property("id").that.to.be.not.null;
    expect(result).to.have.property("name").that.to.be.eq(nftCreationParams.name);
    expect(result).to.have.property("message").that.to.be.eq(nftCreationParams.message);
    expect(result).to.have.property("creator").that.to.be.eq(signerAddresses[1]);
    expect(result).to.have.property("creation_time");
    const creationTime = result.creation_time.toString();
    expect(creationTime).to.have.lengthOf(10);
  });

  it("Should return false when all of input token ids do not belong to caller", async () => {
    for (const i of [10, 11]) {
      await testToken.connect(packetCreator).transferFrom(signerAddresses[1], signerAddresses[3], i);
    }
    const isOwner = await redpacket.connect(packetCreator).check_ownership([10, 11], testToken.address);
    expect(isOwner).to.be.false;
  });

  it("Should return false when part of input token ids do not belong to caller", async () => {
    await testToken.connect(packetCreator).transferFrom(signerAddresses[1], signerAddresses[3], 43);
    const isOwner = await redpacket.connect(packetCreator).check_ownership([43, 44], testToken.address);
    expect(isOwner).to.be.false;
  });

  it("Should return true when all of input token ids belong to caller", async () => {
    await testToken.connect(packetCreator).transferFrom(signerAddresses[1], signerAddresses[3], 43);
    const isOwner = await redpacket.connect(packetCreator).check_ownership([45, 46], testToken.address);
    expect(isOwner).to.be.true;
  });

  it("Should return availability status when everything is OK", async () => {
    await redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(nftCreationParams));
    const createSuccess = await redpacket.queryFilter(redpacket.filters.CreationSuccess());
    const pktId = first(createSuccess).args.id;
    const pktInfo = await redpacket.check_availability(pktId);
    expect(pktInfo.token_address).to.be.eq(testToken.address);
    expect(pktInfo.expired).to.be.false;
    expect(pktInfo.balance).to.be.eq(3);
    expect(pktInfo.total_pkts.toNumber()).to.be.eq(3);
    expect(pktInfo.claimed_id.toNumber()).to.be.eq(0);
    expect(pktInfo.bit_status.toNumber()).to.be.eq(0);
  });
});
