import { Wallet, utils, BigNumber } from "ethers";
const testWallet = Wallet.createRandom();
export const testPrivateKey: string = testWallet.privateKey;
const testAddress: string = testWallet.address;
export const passwd = "password";
const ethAddress = `0x${"0".repeat(40)}`;
export const creationParams = {
  publicKey: testAddress,
  number: 3,
  ifrandom: true,
  duration: 1000,
  seed: utils.sha256(utils.toUtf8Bytes("lajsdklfjaskldfhaikl")),
  message: "Hi",
  name: "cache",
  tokenType: 0,
  tokenAddr: ethAddress,
  totalTokens: 100000000,
  txParameters: {
    gasLimit: 6000000,
    value: BigNumber.from("100000000"),
  },
};
export const nftCreationParams = {
  publicKey: testAddress,
  duration: 1000,
  seed: utils.sha256(utils.toUtf8Bytes("lajsdklfjaskldfhaikl")),
  message: "Hi",
  name: "cache",
  tokenAddr: ethAddress,
  erc721TokenIds: [0, 1, 2],
  txParameters: {
    gasLimit: 6000000,
  },
};
export const createClaimParam = async (id: string, recipient: string, caller: string): Promise<Object> => {
  var signedMsg = await testWallet.signMessage(utils.arrayify(caller));
  return { id, signedMsg, recipient };
};
export const getRevertMsg = (msg: string): string =>
  `VM Exception while processing transaction: reverted with reason string '${msg}'`;

export const BNSum = (input: BigNumber[]): BigNumber => {
  return input.reduce((prev, cur) => prev.add(cur), BigNumber.from("0"));
};
