# RedPacket

## Introduction

This project(`RedPacket` smart contract) is a Dapplet based on the Mask browser extension. Inspired by [Red Packet](https://en.wikipedia.org/wiki/Red_envelope). It enables you to put cryptocurrency tokens(ETH or ERC-20) into red packets and send them to your friends and family.

Besides, Mask Network developed a new red packet for ERC721/NFT token.

## Getting Started

This is a hardhat project. To install required node.js modules

```bash
npm ci
```

To compile the solidity source code

```bash
npm run compile
```

To run ERC20 RedPacket unit test

```bash
npm run test:normal
```

To run ERC721/NFT RedPacket unit test

```bash
npm run test:erc721
```

To deploy the smart contract on Ethereum ropsten testnet

```bash
npm run deploy:ropsten
```

## Deployed Contract Address

### HappyRedPacket

| Chain            | Address                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Mainnet          | [0xaBBe1101](https://etherscan.io/address/0xaBBe1101FD8fa5847c452A6D70C8655532B03C33)                             |
| Ropsten          | [0x0722507c](https://ropsten.etherscan.io/address/0x0722507c3b776A6B205946592016e358B0D34c3F)                     |
| BSC              | [0x0ca42C17](https://bscscan.com/address/0x0ca42C178e14c618c81B8438043F27d9D38145f6)                              |
| Matic            | [0x93e0b87A](https://polygonscan.com/address/0x93e0b87A0aD0C991dc1B5176ddCD850c9a78aabb)                          |
| Rinkeby-Arbitrum | [0x4A77E797](https://rinkeby-explorer.arbitrum.io/address/0x4A77E797031257db72F7D2C3Ec08a4FAc5c8CfE9)             |
| Arbitrum         | [0x83D6b366](https://explorer.arbitrum.io/address/0x83D6b366f21e413f214EB077D5378478e71a5eD2)                     |
| xDai             | [0x54a0A221](https://blockscout.com/xdai/mainnet/address/0x54a0A221C25Fc0a347EC929cFC5db0be17fA2a2B/transactions) |
| Goerli           | [0x8bF6b979](https://goerli.etherscan.io/address/0x8bF6b979286970860Adc75dc621cf1969b0bE66C)                      |
| Fantom           | [0x578a7Fee](https://ftmscan.com/address/0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98)                              |
| Avalanche        | [0xF9F7C149](https://snowtrace.io/address/0xF9F7C1496c21bC0180f4B64daBE0754ebFc8A8c0)                             |
| Celo             | [0xab7b1be4](https://explorer.celo.org/address/0xab7b1be4233a04e5c43a810e75657eced8e5463b/transactions)           |
| Kovan-optimistic | [0x68EDbfA3](https://kovan-optimistic.etherscan.io/address/0x68EDbfA3E564C987FaaAB54f4FD1E7567D4151Dd)            |
| Optimistic       | [0x981be454](https://optimistic.etherscan.io/address/0x981be454a930479d92C91a0092D204b64845A5D6)                  |
| Aurora           | [0x19f179D7](https://explorer.mainnet.aurora.dev/address/0x19f179D7e0D7d9F9d5386afFF64271D98A91615B/transactions) |
| Fuse             | [0x561c5f3a](https://explorer.fuse.io/address/0x561c5f3a19871ecb1273D6D8eCc276BeEDa5c8b4/transactions)            |
| Boba             | [0x578a7Fee](https://blockexplorer.boba.network/address/0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98/transactions)  |
| Moonriver        | [0x578a7Fee](https://moonriver.moonscan.io/address/0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98)                    |

### HappyRedPacket_ERC721

| Chain            | Address                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Mainnet          | [0x8d285739](https://etherscan.io/address/0x8d285739523FC2Ac8eC9c9C229ee863C8C9bF8C8)                             |
| Ropsten          | [0x8fF42e93](https://ropsten.etherscan.io/address/0x8fF42e93C19E44763FD1cD07b9E04d13bA07AD3f)                     |
| BSC              | [0xf8968e1F](https://bscscan.com/address/0xf8968e1Fcf1440Be5Cec7Bb495bcee79753d5E06)                              |
| Matic            | [0xf6Dc0427](https://polygonscan.com/address/0xf6Dc042717EF4C097348bE00f4BaE688dcaDD4eA)                          |
| Arbitrum         | [0x561c5f3a](https://explorer.arbitrum.io/address/0x561c5f3a19871ecb1273D6D8eCc276BeEDa5c8b4)                     |
| xDai             | [0x561c5f3a](https://blockscout.com/xdai/mainnet/address/0x561c5f3a19871ecb1273D6D8eCc276BeEDa5c8b4/transactions) |
| Goerli           | [0x0a04e23f](https://goerli.etherscan.io/address/0x0a04e23f95E9DB2Fe4C31252548F663fFe3AAe4d)                      |
| Fantom           | [0xF9F7C149](https://ftmscan.com/address/0xF9F7C1496c21bC0180f4B64daBE0754ebFc8A8c0)                              |
| Avalanche        | [0x96c7D011](https://snowtrace.io/address/0x96c7D011cdFD467f551605f0f5Fce279F86F4186)                             |
| Celo             | [0x96c7D011](https://explorer.celo.org/address/0x96c7D011cdFD467f551605f0f5Fce279F86F4186/transactions)           |
| Kovan-optimistic | [0x556F63d7](https://kovan-optimistic.etherscan.io/address/0x556F63d7467c729034585C3e50e54e582222b491)            |
| Optimistic       | [0x02Ea0720](https://optimistic.etherscan.io/address/0x02Ea0720254F7fa4eca7d09A1b9C783F1020EbEF)                  |
| Aurora           | [0x05ee315E](https://explorer.mainnet.aurora.dev/address/0x05ee315E407C21a594f807D61d6CC11306D1F149/transactions) |
| Fuse             | [0x066804d9](https://explorer.fuse.io/address/0x066804d9123bF2609Ed4A4a40b1177a9c5a9Ed51/transactions)            |
| Boba             | [0xF9F7C149](https://blockexplorer.boba.network/address/0xF9F7C1496c21bC0180f4B64daBE0754ebFc8A8c0/transactions)  |
| Moonriver        | [0xF9F7C149](https://moonriver.moonscan.io/address/0xF9F7C1496c21bC0180f4B64daBE0754ebFc8A8c0)                    |

## Test report

Unit test and performance(gas consumption) results, please see [test report](docs/test_report.txt) and [gas consumption test report](docs/performance_test.txt).

## Version history

Change, please see [Change log](docs/CHANGELOG.md) for changes.

## Contribute

Any contribution is welcomed to make it better.

If you have any questions, please create an [issue](https://github.com/DimensionDev/RedPacket/issues).

## License

[MIT LICENSE](LICENSE)
