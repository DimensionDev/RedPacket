import { ethers, waffle } from "hardhat";
import { Signer, BigNumber } from "ethers";
import { takeSnapshot, revertToSnapShot } from "../helper";
import { nftCreationParams, getRevertMsg, createClaimParam, NftCreationParamType } from "../constants";
import { range, first, times } from "lodash";
import { use } from "chai";
import chaiAsPromised from "chai-as-promised";
const { expect } = use(chaiAsPromised);
const { deployContract } = waffle;

import RedPacket721Artifact from "../../artifacts/contracts/redpacket_erc721.sol/HappyRedPacket_ERC721.json";
import { HappyRedPacket_ERC721 } from "../../types/contracts/redpacket_erc721.sol/HappyRedPacket_ERC721";
import TestTokenArtifact from "../../artifacts/contracts/test_token_erc721.sol/TestToken_721.json";
import { TestToken_721 } from "../../types/contracts/test_token_erc721.sol/TestToken_721";
const gasLimitMultiplyingFactor = 1.5;

describe("Test nft redpacket worst cases", () => {
  let redpacket: HappyRedPacket_ERC721;
  let testToken: TestToken_721;
  let signers: Signer[];
  let signerAddresses: string[];
  let contractCreator: Signer;
  let packetCreator: Signer;
  let snapshotId: string;
  let creationParam: NftCreationParamType;

  before(async () => {
    signers = await ethers.getSigners();
    contractCreator = signers[0];
    packetCreator = signers[1];
    signerAddresses = await Promise.all(
      signers.map(async (signer): Promise<string> => {
        return await signer.getAddress();
      }),
    );

    redpacket = (await deployContract(contractCreator, RedPacket721Artifact)) as HappyRedPacket_ERC721;
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
    const amount = BigNumber.from("260");
    testToken = (await deployContract(packetCreator, TestTokenArtifact, [amount])) as TestToken_721;
    creationParam = {
      ...nftCreationParams,
      tokenAddr: testToken.address,
      erc721TokenIds: range(0, 256),
    };
    await testToken.connect(packetCreator).setApprovalForAll(redpacket.address, true);
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
  });

  it("Should claim NFT success if there exists available nft", async () => {
    const pktId = await createRedPacket(creationParam);

    // random pick two nfts as the available nfts
    var remainId1 = Math.floor(Math.random() * 256);
    var remainId2 = Math.floor(Math.random() * 256);
    while (remainId1 == remainId2) {
      remainId2 = Math.floor(Math.random() * 256);
    }
    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    const claimParams2 = await createClaimParam(pktId, signerAddresses[3], signerAddresses[3]);
    await Promise.all(
      times(256, async (index) => {
        if (index == remainId1 || index == remainId2) return;
        await testToken.connect(packetCreator).transferFrom(signerAddresses[1], signerAddresses[3], index);
      }),
    );

    const estimatedGas: BigNumber = await redpacket
      .connect(signers[2])
      .estimateGas.claim.apply(null, Object.values(claimParams));
    const finalEstimatedGas = Math.floor(estimatedGas.toNumber() * gasLimitMultiplyingFactor);
    claimParams["txParameter"] = {
      gasLimit: finalEstimatedGas,
    };
    await redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams));
    const claimEvents = await redpacket.queryFilter(redpacket.filters.ClaimSuccess());
    const claimEvent = first(claimEvents);
    const claimedId1 = claimEvent.args.claimed_token_id;
    expect(claimedId1.toNumber()).to.be.oneOf([remainId1, remainId2]);

    const estimatedGas2: BigNumber = await redpacket
      .connect(signers[3])
      .estimateGas.claim.apply(null, Object.values(claimParams2));
    const finalEstimatedGas2 = Math.floor(estimatedGas2.toNumber() * gasLimitMultiplyingFactor);
    claimParams2["txParameter"] = {
      gasLimit: finalEstimatedGas2,
    };
    await redpacket.connect(signers[3]).claim.apply(null, Object.values(claimParams2));
    const claimEvent2 = (await redpacket.queryFilter(redpacket.filters.ClaimSuccess()))[1];
    const claimedId2 = claimEvent2.args.claimed_token_id;
    const supposedToRemain = [remainId1, remainId2].find((ele) => ele != claimedId1.toNumber());
    expect(claimedId2.toNumber()).to.be.eq(supposedToRemain);
  });

  it("Should throw error if all NFTs are transferred", async () => {
    const pktId = await createRedPacket(creationParam);
    await Promise.all(
      times(256, async (index) => {
        await testToken.connect(packetCreator).transferFrom(signerAddresses[1], signerAddresses[3], index);
      }),
    );

    const claimParams = await createClaimParam(pktId, signerAddresses[2], signerAddresses[2]);
    claimParams["txParameter"] = {
      gasLimit: 6000000,
    };
    await expect(redpacket.connect(signers[2]).claim.apply(null, Object.values(claimParams))).to.be.revertedWith(
      getRevertMsg("No available token remain"),
    );
  });

  async function createRedPacket(creationParams: any): Promise<string> {
    await redpacket.connect(packetCreator).create_red_packet.apply(null, Object.values(creationParams));
    const createSuccessEvents = await redpacket.queryFilter(redpacket.filters.CreationSuccess());
    return first(createSuccessEvents).args.id;
  }
});
