pragma solidity >0.4.22;

import "truffle/Assert.sol";
import "../contracts/redpacket.sol";

contract TestRedPacket {
    bytes32[] hashes = [keccak256(abi.encode(1)), keccak256(abi.encode(2))];
    function testInit() public{
        RedPacket rp = new RedPacket(hashes, true, now+1);
        Assert.equal(rp.check_availability(), 2, "haha");
    }
}
