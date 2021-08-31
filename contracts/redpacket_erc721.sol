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
        address creator;
        uint16 remaining_tokens;
        address token_addr;
        uint32 end_time;
        mapping(address => uint256) claimed_list; 
        uint256[] erc721_list;
        address public_key;
        uint256 bit_status; //0 - available 1 - not available
    }

    event CreationSuccess (
        uint256 total_tokens,
        bytes32 indexed id,
        string name,
        string message,
        address indexed creator,
        uint256 creation_time,
        address token_address,
        uint256 packet_number,
        uint256 duration,
        uint256[] token_ids
    );

    event ClaimSuccess(
        bytes32 indexed id,
        address indexed claimer,
        uint256 claimed_token_id,
        address token_address
    );

    uint32 nonce;
    mapping(bytes32 => RedPacket) redpacket_by_id;
    bytes32 private seed;

    function initialize() public initializer {
        seed = keccak256(abi.encodePacked("Former NBA Commissioner David St", block.timestamp, msg.sender));
    }

    // Remember to call check_ownership() before create_red_packet()
    function check_ownership(uint256[] memory erc721_token_id_list, address token_addr) 
        external 
        view 
        returns(bool is_your_token)
    {
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


    function create_red_packet (
        address _public_key,
        uint64 _duration,
        bytes32 _seed,
        string memory _message,
        string memory _name,
        address _token_addr,
        uint256[] memory _erc721_token_ids
    )
        external
    {
        nonce ++;
        require(_erc721_token_ids.length > 0, "At least 1 recipient");
        require(_erc721_token_ids.length <= 256, "At most 256 recipient");
        require(IERC721(_token_addr).isApprovedForAll(msg.sender, address(this)), "No approved yet");

        bytes32 packet_id = keccak256(abi.encodePacked(msg.sender, block.timestamp, nonce, seed, _seed));
        {
            RedPacket storage rp = redpacket_by_id[packet_id];
            rp.creator = msg.sender;
            rp.remaining_tokens = uint16(_erc721_token_ids.length);
            rp.token_addr = _token_addr;
            rp.end_time = uint32(block.timestamp + _duration);
            rp.erc721_list = _erc721_token_ids;
            rp.public_key = _public_key;
        }
        {
            uint256 number = _erc721_token_ids.length;
            uint256 duration = _duration;
            emit CreationSuccess (
                _erc721_token_ids.length, 
                packet_id, 
                _name,
                _message, 
                msg.sender, 
                block.timestamp, 
                _token_addr, 
                number, 
                duration, 
                _erc721_token_ids
            );
        }
    }

    function claim(bytes32 pkt_id, bytes memory signedMsg, address payable recipient)
        external 
        returns (uint256 claimed)
    {
        RedPacket storage rp = redpacket_by_id[pkt_id];
        uint256[] storage erc721_token_id_list = rp.erc721_list;
        require(rp.end_time > block.timestamp, "Expired"); 
        require(_verify(signedMsg, rp.public_key), "verification failed");
        uint16 remaining_tokens = rp.remaining_tokens;
        require(remaining_tokens > 0, "No available token remain");

        uint256 claimed_index;
        uint256 claimed_token_id;
        uint256 new_bit_status;
        uint16 new_remaining_tokens;
        (
            claimed_index, 
            claimed_token_id,
            new_bit_status, 
            new_remaining_tokens
        ) = _get_token_index(
            erc721_token_id_list, 
            remaining_tokens, 
            rp.token_addr, 
            rp.creator,
            rp.bit_status
        );

        rp.bit_status  = new_bit_status | (1 << claimed_index);
        rp.remaining_tokens = new_remaining_tokens - 1;

        // Penalize greedy attackers by placing duplication check at the very last
        require(rp.claimed_list[msg.sender] == 0, "Already claimed");
        rp.claimed_list[msg.sender] = claimed_token_id;
        address token_addr = rp.token_addr;
        IERC721(token_addr).safeTransferFrom(rp.creator, recipient, claimed_token_id);

        emit ClaimSuccess(pkt_id, address(recipient), claimed_token_id, token_addr);
        return claimed_token_id;
    }

    function check_availability(bytes32 pkt_id) 
        external
        view
        returns (
            address token_address,
            uint16 balance, 
            uint256 total_pkts,
            bool expired, 
            uint256 claimed_id,
            uint256 bit_status
        )
    {
        RedPacket storage rp = redpacket_by_id[pkt_id];
        return (
            rp.token_addr,
            rp.remaining_tokens,
            rp.erc721_list.length,
            block.timestamp > rp.end_time,
            rp.claimed_list[msg.sender],
            rp.bit_status
        );
    }

    function check_claimed_id(bytes32 id) 
        external 
        view 
        returns(uint256 claimed_token_id)
    {
        RedPacket storage rp = redpacket_by_id[id];
        claimed_token_id = rp.claimed_list[msg.sender];
        return(claimed_token_id);
    }

    function check_erc721_remain_ids(bytes32 id)
        external 
        view returns(uint256 bit_status, uint256[] memory erc721_token_ids)
    {
        RedPacket storage rp = redpacket_by_id[id];
        erc721_token_ids = rp.erc721_list;
        // use bit_status to get remained token id in erc_721_token_ids
        return(rp.bit_status, erc721_token_ids);
    }

//------------------------------------------------------------------
    // as a workaround for "CompilerError: Stack too deep, try removing local variables"
    function _verify(bytes memory signedMsg, address public_key) private view returns (bool verified) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n20";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, msg.sender));
        address calculated_public_key = ECDSA.recover(prefixedHash, signedMsg);
        return (calculated_public_key == public_key);
    }

    function _get_token_index(
        uint256[] storage erc721_token_id_list,
        uint16 remaining_tokens,
        address token_addr,
        address creator,
        uint256 bit_status
    )
        private
        view
        returns(
            uint256 index,
            uint256 claimed_token_id,
            uint256 new_bit_status,
            uint16 new_remaining_tokens
        )
    {
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

    function _get_exact_index(uint256 bit_status, uint256 claimed_index) 
        private 
        pure 
        returns (uint16 real_index)
    {
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

    // A boring wrapper
    function random(bytes32 _seed, uint32 nonce_rand) internal view returns (uint256 rand) {
        return uint256(keccak256(abi.encodePacked(nonce_rand, msg.sender, _seed, block.timestamp))) + 1 ;
    }
}
