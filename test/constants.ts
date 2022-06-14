import { BigNumber, utils, Wallet } from "ethers";
const testWallet = Wallet.createRandom();
export const testPrivateKey: string = testWallet.privateKey;
const testAddress: string = testWallet.address;
export const passwd = "password";
const ethAddress = `0x${"0".repeat(40)}`;
export const creationParams: FtCreationParamType = {
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
    gasLimit: BigNumber.from("6000000"),
    value: BigNumber.from("100000000"),
  },
};

export const nftCreationParams: NftCreationParamType = {
  publicKey: testAddress,
  duration: 1000,
  seed: utils.sha256(utils.toUtf8Bytes("lajsdklfjaskldfhaikl")),
  message: "Hi",
  name: "cache",
  tokenAddr: ethAddress,
  erc721TokenIds: [0, 1, 2],
  txParameters: {
    gasLimit: BigNumber.from("6000000"),
  },
};

export interface FtCreationParamType {
  publicKey: string;
  number: number;
  ifrandom: boolean;
  duration: number;
  seed: string;
  message: string;
  name: string;
  tokenType: number;
  tokenAddr: string;
  totalTokens: number;
  txParameters?: TxParameter;
}

export interface NftCreationParamType {
  publicKey: string;
  duration: number;
  seed: string;
  message: string;
  name: string;
  tokenAddr: string;
  erc721TokenIds: number[];
  txParameters?: TxParameter;
}

interface TxParameter {
  gasLimit?: BigNumber;
  value?: BigNumber;
}

export const createClaimParam = async (id: string, recipient: string, caller: string): Promise<Object> => {
  var signedMsg = await testWallet.signMessage(utils.arrayify(caller));
  return { id, signedMsg, recipient };
};
export const getRevertMsg = (msg: string): string =>
  `VM Exception while processing transaction: reverted with reason string '${msg}'`;

export const BNSum = (input: BigNumber[]): BigNumber => {
  return input.reduce((prev, cur) => prev.add(cur), BigNumber.from("0"));
};
