pragma solidity ^0.6;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";

contract Test721Token is ERC721 {
    constructor (uint256 initialSupply) public ERC721("Test721Token", "TEST721") {
        for (uint i=0; i<initialSupply; i++) {
          _mint(msg.sender, i);
        }
    }
}
