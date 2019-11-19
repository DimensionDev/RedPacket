pragma solidity >0.4.22;

import "truffle/Assert.sol";
import "../contracts/redpacket.sol";

contract TestRedPacket {
    bytes32[] hashes = [keccak256(abi.encode(1)), keccak256(abi.encode(2))];
    uint public initialBalance = 1 ether;
    function testInit() public{
        RedPacket rp = new RedPacket();
    }
}
