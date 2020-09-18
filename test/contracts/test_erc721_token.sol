pragma solidity >0.4.22;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721Enumerable.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721Metadata.sol";

contract Test721Token is ERC721, ERC721Enumerable, ERC721Metadata {
    constructor (uint256 initialSupply) public ERC721Metadata("Test721Token", "TEST721") {
        for (uint i=0; i<initialSupply; i++) {
          _mint(msg.sender, i);
        }
    }
}
