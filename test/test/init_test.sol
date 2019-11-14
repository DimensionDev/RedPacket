pragma solidity >0.4.22;

import "truffle/Assert.sol";
import "truffle/DepolyedAddresses.sol";
import "../contracts/redpacket.sol";

contract TestRedPacket {
    function testInit() {
        bytes32[] hashes;
        for (uint i = 0; i < 2; i++){
            hashes.push(keccak256(abi.encode(i)));
        }
        RedPacket rp = RedPacket(DeployedAddresses.RedPacket(hashes, true));
    }
}
