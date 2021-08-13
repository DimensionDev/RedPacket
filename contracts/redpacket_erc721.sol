// SPDX-License-Identifier: MIT

/**
 * @author          Mengjie Chen
 * @contact         mengjie_chen@mask.io
 * @author_time     07/16/2021
 * @maintainer      Mengjie Chen
 * @maintain_time   07/30/2021
**/

pragma solidity >= 0.8.0;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract HappyRedPacket_ERC721 is Initializable {

    struct RedPacket {
        Packed packed;
        mapping(address => uint256) claimed_list; 
        uint256[] erc721_list;
        address public_key;
        uint256 bit_status; //0 - available 1 - not available
    }

    struct Packed{
        uint256 packed1;      // creator (160) total_tokens (96) 
        uint256 packed2;      // 0 (34) token_addr(160) expire_time(32) claimed_numbers(15) total_numbers(15) 
    }

    event CreationSuccess (
        uint256 total_tokens,
        bytes32 id,
        string name,
        string message,
        address creator,
        uint256 creation_time,
        address token_address,
        uint256 packet_number,
        uint256 duration,
        uint256[] token_ids
    );

    event ClaimSuccess(
        bytes32 id,
        address claimer,
        uint256 claimed_token_id,
        address token_address
    );

    event RefundSuccess(
        bytes32 id,
        address token_address,
        uint256 remaining_balance,
        uint256[] remaining_token_ids,
        uint256 bit_status
    );

    uint32 nonce;
    mapping(bytes32 => RedPacket) redpacket_by_id;
    bytes32 private seed;

    function initialize() public initializer {
        seed = keccak256(abi.encodePacked("Former NBA Commissioner David St", block.timestamp, msg.sender));
    }

    // Remember to call check_ownership() before create_red_packet()
    function check_ownership(uint256[] memory erc721_token_id_list, address token_addr) external view returns(bool is_your_token){
        is_your_token = true;
        for (uint256 i= 0; i < erc721_token_id_list.length; i ++){
            address owner = IERC721(token_addr).ownerOf(erc721_token_id_list[i]);
            if (owner != msg.sender){
                is_your_token = false;
                break;
            }
        }
        return is_your_token;
    }


    function create_red_packet (address _public_key, uint256 _duration,
                                bytes32 _seed, string memory _message, string memory _name,
                                address _token_addr, uint256[] memory _erc721_token_ids)
    external payable {
        nonce ++;
        require(_erc721_token_ids.length > 0, "At least 1 recipient");
        require(_erc721_token_ids.length <= 256, "At most 256 recipient");
        require(IERC721(_token_addr).isApprovedForAll(msg.sender, address(this)), "No approved yet");                                                                       

        bytes32 packet_id = keccak256(abi.encodePacked(msg.sender, block.timestamp, nonce, seed, _seed));
        {
            RedPacket storage rp = redpacket_by_id[packet_id];
            rp.packed.packed1 = wrap1(_erc721_token_ids.length);
            rp.packed.packed2 = wrap2(_token_addr,_duration, _erc721_token_ids.length);
            rp.erc721_list = _erc721_token_ids;
            rp.public_key = _public_key;
        }
        {
            uint256 number = _erc721_token_ids.length;
            uint256 duration = _duration;
            emit CreationSuccess (_erc721_token_ids.length, packet_id, _name,
                                 _message, msg.sender, block.timestamp, 
                                 _token_addr, number, duration, _erc721_token_ids);
        }
    }

    function claim(bytes32 pkt_id, bytes memory signedMsg, address payable recipient)
    external returns (uint256 claimed){
        RedPacket storage rp = redpacket_by_id[pkt_id];
        Packed memory packed = rp.packed;
        uint256[] storage erc721_token_id_list = rp.erc721_list;

        require(unbox(packed.packed2, 194, 32) > block.timestamp, "Expired"); 
        uint256 claimed_number = unbox(packed.packed2, 226, 15);
        uint256 total_number = unbox(packed.packed2, 241, 15);
        require (claimed_number < total_number, "Out of stock");

        address public_key = rp.public_key;
        require(_verify(signedMsg, public_key), "verification failed");

        uint256 remaining_tokens = unbox(packed.packed1, 160, 96);
        require(remaining_tokens > 0, "No available token remain");

        uint256 claimed_index;
        uint256 claimed_token_id;
        uint256 new_bit_status;
        (claimed_index, claimed_token_id,
         new_bit_status, remaining_tokens) = _get_token_index(erc721_token_id_list, remaining_tokens, packed,
                                                                rp.bit_status);

        rp.bit_status  = new_bit_status | (1 << claimed_index);
        rp.packed.packed1 = rewriteBox(packed.packed1, 160, 96, remaining_tokens - 1);


        // Penalize greedy attackers by placing duplication check at the very last
        require(rp.claimed_list[msg.sender] == 0, "Already claimed");
        rp.claimed_list[msg.sender] = claimed_token_id;
        rp.packed.packed2 = rewriteBox(packed.packed2, 226, 15, claimed_number + 1);
        address token_addr;
        {
            token_addr = address(uint160(unbox(packed.packed2, 34, 160)));
            address creator = address(uint160(unbox(packed.packed1, 0, 160)));
            address payable _recipient = recipient;
            IERC721(token_addr).safeTransferFrom(creator, _recipient, claimed_token_id);
        }

        emit ClaimSuccess(pkt_id, address(recipient), claimed_token_id, token_addr);
        return claimed_token_id;
    }

    function check_availability(bytes32 pkt_id) 
    external view returns ( address token_address, uint balance, 
                            uint total_pkts, uint claimed_pkts, bool expired, 
                            uint256 claimed_id, uint256 bit_status) 
    {
        RedPacket storage rp = redpacket_by_id[pkt_id];
        Packed memory packed = rp.packed;
        return (
            address(uint160(unbox(packed.packed2, 34, 160))), 
            unbox(packed.packed1, 160, 96), 
            unbox(packed.packed2, 241, 15), 
            unbox(packed.packed2, 226, 15), 
            block.timestamp > unbox(packed.packed2, 194, 32), 
            rp.claimed_list[msg.sender],
            rp.bit_status
        );
    }

    function check_claimed_id(bytes32 id) 
             external view returns(uint256 claimed_token_id)
    {
        RedPacket storage rp = redpacket_by_id[id];
        claimed_token_id = rp.claimed_list[msg.sender];
        return(claimed_token_id);
    }

    function check_erc721_remain_ids(bytes32 id)
             external view returns(uint256 bit_status, uint256[] memory erc721_token_ids)
    {
        RedPacket storage rp = redpacket_by_id[id];
        erc721_token_ids = rp.erc721_list;
        // use bit_status to get remained token id in erc_721_token_ids
        return(rp.bit_status, erc721_token_ids);
    }

    function refund(bytes32 id) external {
        RedPacket storage rp = redpacket_by_id[id];
        Packed memory packed = rp.packed;
        require(uint160(msg.sender) == unbox(packed.packed1, 0, 160), "Creator Only");
        require(unbox(packed.packed2, 194, 32) <= block.timestamp, "Not expired yet");

        uint256 remaining_tokens = unbox(packed.packed1, 160, 96);
        require(remaining_tokens != 0, "None left in the red packet");

        address token_addr = address(uint160(unbox(packed.packed2, 34, 160)));

        rp.packed.packed1 = rewriteBox(packed.packed1, 160, 96, 0);

        emit RefundSuccess(id, token_addr, remaining_tokens, rp.erc721_list, rp.bit_status);
    }

//------------------------------------------------------------------
    // as a workaround for "CompilerError: Stack too deep, try removing local variables"
    function _verify(bytes memory signedMsg, address public_key) private view returns (bool verified) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n20";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, msg.sender));
        address calculated_public_key = ECDSA.recover(prefixedHash, signedMsg);
        return (calculated_public_key == public_key);
    }

    function _get_token_index(uint256[] storage erc721_token_id_list,
                              uint256 remaining_tokens,
                              Packed memory packed,
                              uint256 bit_status)
    private view returns (uint256 index, uint256 claimed_token_id, uint256 new_bit_status, uint256 new_remaining_tokens){
        address token_addr = address(uint160(unbox(packed.packed2, 34, 160)));
        address creator = address(uint160(unbox(packed.packed1, 0, 160)));
        uint256 claimed_index = random(seed, nonce) % (remaining_tokens);
        uint16 real_index = _get_exact_index(bit_status, claimed_index);
        claimed_token_id = erc721_token_id_list[real_index];
        while (IERC721(token_addr).ownerOf(claimed_token_id) != creator){
            bit_status = bit_status | (1 << real_index);
            remaining_tokens --;
            require(remaining_tokens > 0, "No available token remain");
            claimed_index = random(seed, nonce) % (remaining_tokens);
            real_index = _get_exact_index(bit_status, claimed_index);
            claimed_token_id = erc721_token_id_list[real_index];
        }
        return(real_index, claimed_token_id, bit_status, remaining_tokens);
    }

    function _get_exact_index(uint256 bit_status, uint256 claimed_index) private pure returns (uint16 real_index){
        uint16 real_count = 0;
        uint16 count = uint16(claimed_index + 1);
        while (count > 0){
            if ((bit_status & 1) == 0){
                count --;
            }
            real_count ++;
            bit_status = bit_status >> 1;  
        }
        
        return real_count - 1;
    }

    /**
     * position      position in a memory block
     * size          data size
     * data          data
     * box() inserts the data in a 256bit word with the given position and returns it
     * data is checked by validRange() to make sure it is not over size 
    **/

    function box (uint16 position, uint16 size, uint256 data) internal pure returns (uint256 boxed) {
        require(validRange(size, data), "Value out of range BOX");
        assembly {
            // data << position
            boxed := shl(position, data)
        }
    }

    /**
     * position      position in a memory block
     * size          data size
     * base          base data
     * unbox() extracts the data out of a 256bit word with the given position and returns it
     * base is checked by validRange() to make sure it is not over size 
    **/

    function unbox (uint256 base, uint16 position, uint16 size) internal pure returns (uint256 unboxed) {
        require(validRange(256, base), "Value out of range UNBOX");
        assembly {
            // (((1 << size) - 1) & base >> position)
            unboxed := and(sub(shl(size, 1), 1), shr(position, base))

        }
    }

    /**
     * size          data size
     * data          data
     * validRange()  checks if the given data is over the specified data size
    **/

    function validRange (uint16 size, uint256 data) internal pure returns(bool ifValid) { 
        assembly {
            // 2^size > data or size ==256
            ifValid := or(eq(size, 256), gt(shl(size, 1), data))
        }
    }

    /**
     * _box          32byte data to be modified
     * position      position in a memory block
     * size          data size
     * data          data to be inserted
     * rewriteBox() updates a 32byte word with a data at the given position with the specified size
    **/

    function rewriteBox (uint256 _box, uint16 position, uint16 size, uint256 data) 
                        internal pure returns (uint256 boxed) {
        assembly {
            // mask = ~((1 << size - 1) << position)
            // _box = (mask & _box) | ()data << position)
            boxed := or( and(_box, not(shl(position, sub(shl(size, 1), 1)))), shl(position, data))
        }
    }

    // A boring wrapper
    function random(bytes32 _seed, uint32 nonce_rand) internal view returns (uint256 rand) {
        return uint256(keccak256(abi.encodePacked(nonce_rand, msg.sender, _seed, block.timestamp))) + 1 ;
    }

    function wrap1 (uint256 _total_tokens) internal view returns (uint256 packed1) {
        uint256 _packed1 = 0;
        _packed1 |= box(0, 160, uint160(msg.sender));
        _packed1 |= box(160, 96, _total_tokens);
        return _packed1;
    }

    function wrap2 (address _token_addr,uint256 _duration, uint256 _number) internal view returns (uint256 packed2) {
        uint256 _packed2 = 0;
        _packed2 |= box(34, 160, uint160(_token_addr));
        _packed2 |= box(194, 32, (block.timestamp + _duration));
        _packed2 |= box(226, 15, 0); 
        _packed2 |= box(241, 15, _number); 
        return _packed2;
    }

}