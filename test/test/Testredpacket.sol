pragma solidity >0.4.22;

import "truffle/Assert.sol";
import "../contracts/redpacket.sol";

contract TestHappyRedPacket {
    bytes32[] hashes = [keccak256(bytes("1")), keccak256(bytes("2"))];
    uint public initialBalance = 1 ether;

    function testInit() public{
        RedPacket rp = new RedPacket(hashes, true, now+1);
    }
}
