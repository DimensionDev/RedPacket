pragma solidity >0.4.22;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

contract TestToken is ERC20, ERC20Detailed{
    constructor(uint256 initialSupply) ERC20Detailed("TestToken", "TEST", 18) public{
        _mint(msg.sender, initialSupply);
    }
}
