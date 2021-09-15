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

| Chain            | Address                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mainnet          | [0xaBBe1101FD8fa5847c452A6D70C8655532B03C33](https://etherscan.io/address/0xaBBe1101FD8fa5847c452A6D70C8655532B03C33)                             |
| Ropsten          | [0x0722507c3b776A6B205946592016e358B0D34c3F](https://ropsten.etherscan.io/address/0x0722507c3b776A6B205946592016e358B0D34c3F)                     |
| BSC              | [0x0ca42C178e14c618c81B8438043F27d9D38145f6](https://bscscan.com/address/0x0ca42C178e14c618c81B8438043F27d9D38145f6)                              |
| Matic            | [0x93e0b87A0aD0C991dc1B5176ddCD850c9a78aabb](https://polygonscan.com/address/0x93e0b87A0aD0C991dc1B5176ddCD850c9a78aabb)                          |
| Rinkeby-Arbitrum | [0x4A77E797031257db72F7D2C3Ec08a4FAc5c8CfE9](https://rinkeby-explorer.arbitrum.io/address/0x4A77E797031257db72F7D2C3Ec08a4FAc5c8CfE9)             |
| Arbitrum         | [0x83D6b366f21e413f214EB077D5378478e71a5eD2](https://explorer.arbitrum.io/address/0x83D6b366f21e413f214EB077D5378478e71a5eD2)                     |
| xDai             | [0x54a0A221C25Fc0a347EC929cFC5db0be17fA2a2B](https://blockscout.com/xdai/mainnet/address/0x54a0A221C25Fc0a347EC929cFC5db0be17fA2a2B/transactions) |

### HappyRedPacket_ERC721

| Chain    | Address                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mainnet  | [0x8d285739523FC2Ac8eC9c9C229ee863C8C9bF8C8](https://etherscan.io/address/0x8d285739523FC2Ac8eC9c9C229ee863C8C9bF8C8)                             |
| Ropsten  | [0x8fF42e93C19E44763FD1cD07b9E04d13bA07AD3f](https://ropsten.etherscan.io/address/0x8fF42e93C19E44763FD1cD07b9E04d13bA07AD3f)                     |
| BSC      | [0xf8968e1Fcf1440Be5Cec7Bb495bcee79753d5E06](https://bscscan.com/address/0xf8968e1Fcf1440Be5Cec7Bb495bcee79753d5E06)                              |
| Matic    | [0xf6Dc042717EF4C097348bE00f4BaE688dcaDD4eA](https://polygonscan.com/address/0xf6Dc042717EF4C097348bE00f4BaE688dcaDD4eA)                          |
| Arbitrum | [0x561c5f3a19871ecb1273D6D8eCc276BeEDa5c8b4](https://explorer.arbitrum.io/address/0x561c5f3a19871ecb1273D6D8eCc276BeEDa5c8b4)                     |
| xDai     | [0x561c5f3a19871ecb1273D6D8eCc276BeEDa5c8b4](https://blockscout.com/xdai/mainnet/address/0x561c5f3a19871ecb1273D6D8eCc276BeEDa5c8b4/transactions) |

## Test report

Unit test and performance(gas consumption) results, please see [test report](docs/test_report.txt) and [gas consumption test report](docs/performance_test.txt).

## Version history

Change, please see [Change log](docs/CHANGELOG.md) for changes.

## Contribute

Any contribution is welcomed to make it better.

If you have any questions, please create an [issue](https://github.com/DimensionDev/RedPacket/issues).

## License

[MIT LICENSE](LICENSE)
