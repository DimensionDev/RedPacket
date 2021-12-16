//SPDX-License-Identifier: MIT

pragma solidity >0.4.22;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestToken_721 is ERC721 {
    constructor(uint initialSupply) ERC721("TestToken_721", "TEST") public{
        for (uint i=0; i<initialSupply; i++) {
          _mint(msg.sender, i);
        }
    }
}
