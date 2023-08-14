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

> **NOTE:**
>
> Before run deploy scripts, please configure the `.env` file according to `.env.example` file.
>
> - For `verify`: if set `false`, the contract won't be verified during deployment, and vice versa.
> - For `upgrade`: if set `false`, the script will deploy a new contract on the specified chain. Otherwise, the script will upgrade the contract.
>
> If you don't configure the `.env` file properly, the script will deploy a new contract and won't verify contract by default;

```bash
npm run deploy ropsten
```

## Deployed Contract Address

<!-- begin RedPacket -->

| Chain               | HappyRedPacket                         | HappyRedPacket_ERC721                     |
| ------------------- | -------------------------------------- | ----------------------------------------- |
| mainnet             | [`0xaBBe1101`][rp-mainnet]             | [`0x8d285739`][rp721-mainnet]             |
| ropsten             | [`0x0722507c`][rp-ropsten]             | [`0x8fF42e93`][rp721-ropsten]             |
| bsc                 | [`0x0ca42C17`][rp-bsc]                 | [`0xf8968e1F`][rp721-bsc]                 |
| matic               | [`0x93e0b87A`][rp-matic]               | [`0xf6Dc0427`][rp721-matic]               |
| arbitrum_rinkeby    | [`0x4A77E797`][rp-arbitrum_rinkeby]    |                                           |
| arbitrum            | [`0x83D6b366`][rp-arbitrum]            | [`0x561c5f3a`][rp721-arbitrum]            |
| xdai                | [`0x54a0A221`][rp-xdai]                | [`0x561c5f3a`][rp721-xdai]                |
| goerli              | [`0x8bF6b979`][rp-goerli]              | [`0x0a04e23f`][rp721-goerli]              |
| fantom              | [`0x578a7Fee`][rp-fantom]              | [`0xF9F7C149`][rp721-fantom]              |
| avalanche           | [`0xF9F7C149`][rp-avalanche]           | [`0x96c7D011`][rp721-avalanche]           |
| celo                | [`0xab7b1be4`][rp-celo]                | [`0x96c7D011`][rp721-celo]                |
| optimism_kovan      | [`0x68EDbfA3`][rp-optimism_kovan]      | [`0x556F63d7`][rp721-optimism_kovan]      |
| optimism            | [`0x981be454`][rp-optimism]            | [`0x02Ea0720`][rp721-optimism]            |
| aurora              | [`0x19f179D7`][rp-aurora]              | [`0x05ee315E`][rp721-aurora]              |
| fuse                | [`0x561c5f3a`][rp-fuse]                | [`0x066804d9`][rp721-fuse]                |
| boba                | [`0x578a7Fee`][rp-boba]                | [`0xF9F7C149`][rp721-boba]                |
| moonriver           | [`0x578a7Fee`][rp-moonriver]           | [`0xF9F7C149`][rp721-moonriver]           |
| conflux_espace      | [`0x96c7d011`][rp-conflux_espace]      | [`0x5b966f3a`][rp721-conflux_espace]      |
| conflux_espace_test | [`0x913975af`][rp-conflux_espace_test] | [`0x71834a3f`][rp721-conflux_espace_test] |
| harmony             | [`0xab7b1be4`][rp-harmony]             | [`0x83d6b366`][rp721-harmony]             |
| harmony_test        | [`0x96c7d011`][rp-harmony_test]        | [`0x981be454`][rp721-harmony_test]        |
| metis               | [`0x2cf91AD8`][rp-metis]               | [`0x81246335`][rp721-metis]               |
| metis_test          | [`0xAb7B1bE4`][rp-metis_test]          | [`0x2cf91AD8`][rp721-metis_test]          |
| kardia              | [`0x081ea643`][rp-kardia]              | [`0xc3e62b2C`][rp721-kardia]              |
| astar               | [`0x2cF46Db8`][rp-astar]               | [`0xc3e62b2C`][rp721-astar]               |
| base                | [`0x8D03d9b4`][rp-base]                | [`0xbC7d9898`][rp721-base]                |
| base_goerli         | [`0x16f61cb3`][rp-base_goerli]         | [`0x727F8030`][rp721-base_goerli]         |

[rp-mainnet]: https://etherscan.io/address/0xaBBe1101FD8fa5847c452A6D70C8655532B03C33
[rp-ropsten]: https://ropsten.etherscan.io/address/0x0722507c3b776A6B205946592016e358B0D34c3F
[rp-bsc]: https://bscscan.com/address/0x0ca42C178e14c618c81B8438043F27d9D38145f6
[rp-matic]: https://polygonscan.com/address/0x93e0b87A0aD0C991dc1B5176ddCD850c9a78aabb
[rp-arbitrum_rinkeby]: https://rinkeby-explorer.arbitrum.io/address/0x4A77E797031257db72F7D2C3Ec08a4FAc5c8CfE9
[rp-arbitrum]: https://explorer.arbitrum.io/address/0x83D6b366f21e413f214EB077D5378478e71a5eD2
[rp-xdai]: https://blockscout.com/xdai/mainnet/address/0x54a0A221C25Fc0a347EC929cFC5db0be17fA2a2B
[rp-goerli]: https://goerli.etherscan.io/address/0x8bF6b979286970860Adc75dc621cf1969b0bE66C
[rp-fantom]: https://ftmscan.com/address/0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98
[rp-avalanche]: https://snowtrace.io/address/0xF9F7C1496c21bC0180f4B64daBE0754ebFc8A8c0
[rp-celo]: https://explorer.celo.org/address/0xab7b1be4233a04e5c43a810e75657eced8e5463b
[rp-optimism_kovan]: https://kovan-optimistic.etherscan.io/address/0x68EDbfA3E564C987FaaAB54f4FD1E7567D4151Dd
[rp-optimism]: https://optimistic.etherscan.io/address/0x981be454a930479d92C91a0092D204b64845A5D6
[rp-aurora]: https://explorer.mainnet.aurora.dev/address/0x19f179D7e0D7d9F9d5386afFF64271D98A91615B
[rp-fuse]: https://explorer.fuse.io/address/0x561c5f3a19871ecb1273D6D8eCc276BeEDa5c8b4
[rp-boba]: https://blockexplorer.boba.network/address/0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98
[rp-moonriver]: https://moonriver.moonscan.io/address/0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98
[rp-conflux_espace]: https://evm.confluxscan.io/address/0x96c7d011cdfd467f551605f0f5fce279f86f4186
[rp-conflux_espace_test]: https://evmtestnet.confluxscan.io/address/0x913975af2bb8a6be4100d7dc5e9765b77f6a5d6c
[rp-harmony]: https://explorer.harmony.one/address/0xab7b1be4233a04e5c43a810e75657eced8e5463b
[rp-harmony_test]: https://explorer.pops.one/address/0x96c7d011cdfd467f551605f0f5fce279f86f4186
[rp-metis]: https://andromeda-explorer.metis.io/address/0x2cf91AD8C175305EBe6970Bd8f81231585EFbd77
[rp-metis_test]: https://stardust-explorer.metis.io/address/0xAb7B1bE4233A04e5C43a810E75657ECED8E5463B
[rp-kardia]: https://explorer.kardiachain.io/address/0x081ea6437E73F3b4504b131443309404a9bC2054
[rp-astar]: https://blockscout.com/astar/address/0x2cF46Db820e279c5fBF778367D49d9C931D54524
[rp-base]: https://basescan.org/address/0x8D03d9b43e98Cc2f790Be4E96503fD0CcFd04a2D
[rp-base_goerli]: https://goerli.basescan.org/address/0x16f61cb37169523635B6761f3C946892fb3c18fB
[rp721-mainnet]: https://etherscan.io/address/0x8d285739523FC2Ac8eC9c9C229ee863C8C9bF8C8
[rp721-ropsten]: https://ropsten.etherscan.io/address/0x8fF42e93C19E44763FD1cD07b9E04d13bA07AD3f
[rp721-bsc]: https://bscscan.com/address/0xf8968e1Fcf1440Be5Cec7Bb495bcee79753d5E06
[rp721-matic]: https://polygonscan.com/address/0xf6Dc042717EF4C097348bE00f4BaE688dcaDD4eA
[rp721-arbitrum]: https://explorer.arbitrum.io/address/0x561c5f3a19871ecb1273D6D8eCc276BeEDa5c8b4
[rp721-xdai]: https://blockscout.com/xdai/mainnet/address/0x561c5f3a19871ecb1273D6D8eCc276BeEDa5c8b4
[rp721-goerli]: https://goerli.etherscan.io/address/0x0a04e23f95E9DB2Fe4C31252548F663fFe3AAe4d
[rp721-fantom]: https://ftmscan.com/address/0xF9F7C1496c21bC0180f4B64daBE0754ebFc8A8c0
[rp721-avalanche]: https://snowtrace.io/address/0x96c7D011cdFD467f551605f0f5Fce279F86F4186
[rp721-celo]: https://explorer.celo.org/address/0x96c7D011cdFD467f551605f0f5Fce279F86F4186
[rp721-optimism_kovan]: https://kovan-optimistic.etherscan.io/address/0x556F63d7467c729034585C3e50e54e582222b491
[rp721-optimism]: https://optimistic.etherscan.io/address/0x02Ea0720254F7fa4eca7d09A1b9C783F1020EbEF
[rp721-aurora]: https://explorer.mainnet.aurora.dev/address/0x05ee315E407C21a594f807D61d6CC11306D1F149
[rp721-fuse]: https://explorer.fuse.io/address/0x066804d9123bF2609Ed4A4a40b1177a9c5a9Ed51
[rp721-boba]: https://blockexplorer.boba.network/address/0xF9F7C1496c21bC0180f4B64daBE0754ebFc8A8c0
[rp721-moonriver]: https://moonriver.moonscan.io/address/0xF9F7C1496c21bC0180f4B64daBE0754ebFc8A8c0
[rp721-conflux_espace]: https://evm.confluxscan.io/address/0x5b966f3a32db9c180843bcb40267a66b73e4f022
[rp721-conflux_espace_test]: https://evmtestnet.confluxscan.io/address/0x71834a3fdea3e70f14a93ed85c6be70925d0cad9
[rp721-harmony]: https://explorer.harmony.one/address/0x83d6b366f21e413f214eb077d5378478e71a5ed2
[rp721-harmony_test]: https://explorer.pops.one/address/0x981be454a930479d92c91a0092d204b64845a5d6
[rp721-metis]: https://andromeda-explorer.metis.io/address/0x812463356F58fc8194645A1838ee6C52D8ca2D26
[rp721-metis_test]: https://stardust-explorer.metis.io/address/0x2cf91AD8C175305EBe6970Bd8f81231585EFbd77
[rp721-kardia]: https://explorer.kardiachain.io/address/0xc3e62b2CC70439C32a381Bfc056aCEd1d7162cef
[rp721-astar]: https://blockscout.com/astar/address/0xc3e62b2CC70439C32a381Bfc056aCEd1d7162cef
[rp721-base]: https://basescan.org/address/0xbC7d98985966f56A66B0cB5F23d865676dc2ac84
[rp721-base_goerli]: https://goerli.basescan.org/address/0x727F8030964CCEC6B0E344399c8d8E2B4C837351

<!-- end RedPacket -->

## Test report

Unit test and performance(gas consumption) results, please see [test report](docs/test_report.txt) and [gas consumption test report](docs/performance_test.txt).

## Version history

Change, please see [Change log](docs/CHANGELOG.md) for changes.

## Contribute

Any contribution is welcomed to make it better.

If you have any questions, please create an [issue](https://github.com/DimensionDev/RedPacket/issues).

## Security report

If you have any security issue, please send to <security@mask.io>.

## License

[MIT LICENSE](LICENSE)
