pragma solidity 0.6.2;
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract HappyRedPacket {

    struct RedPacket {
        uint256 packed1;            // exp(48) total_tokens(80) hash(64) id(64) BIG ENDIAN
        uint256 packed2;            // ifrandom(1) token_type(8) total_number(8) claimed(8) creator(64) token_addr(160)
        uint256[] claimed_list;
    }

    event CreationSuccess(
        uint total,
        bytes32 id,
        string name,
        string message,
        address creator,
        uint creation_time,
        address token_address
    );

    event ClaimSuccess(
        bytes32 id,
        address claimer,
        uint claimed_value,
        address token_address
    );

    event RefundSuccess(
        bytes32 id,
        address token_address,
        uint remaining_balance
    );

    using SafeERC20 for IERC20;
    uint32 nonce;
    address public contract_creator;
    mapping(bytes32 => RedPacket) redpacket_by_id;
    string constant private magic = "Former NBA Commissioner David St"; // 32 bytes
    bytes32 private seed;
    uint256 constant MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

    constructor() public {
        contract_creator = msg.sender;
        seed = keccak256(abi.encodePacked(magic, now, contract_creator));
    }

    // Inits a red packet instance
    // _token_type: 0 - ETH 1 - ERC20
    function create_red_packet (bytes32 _hash, uint _number, bool _ifrandom, uint _duration, 
                                bytes32 _seed, string memory _message, string memory _name,
                                uint _token_type, address _token_addr, uint _total_tokens) 
    public payable {
        nonce ++;
        require(_total_tokens >= _number, "#tokens > #packets");
        require(_number > 0, "At least 1 recipient");
        require(_number < 256, "At most 255 recipients");

        if (_token_type == 0) {
            require(msg.value >= _total_tokens, "No enough tokens");
        }
        else if (_token_type == 1) {
            require(IERC20(_token_addr).allowance(msg.sender, address(this)) >= _total_tokens, "No enough allowance");
            IERC20(_token_addr).safeTransferFrom(msg.sender, address(this), _total_tokens);
        }

        bytes32 _id = keccak256(abi.encodePacked(msg.sender, now, nonce, seed, _seed));
        uint _random_type = _ifrandom ? 1 : 0;
        RedPacket storage redp = redpacket_by_id[_id];
        redp.packed1 = wrap1(_hash, _total_tokens, _duration);
        redp.packed2 = wrap2(_token_addr, _number, _token_type, _random_type);
        redp.claimed_list = new uint256[]((_number-1)/4 + 1);
        emit CreationSuccess(_total_tokens, _id, _name, _message, msg.sender, now, _token_addr);
    }

    // It takes the unhashed password and a hashed random seed generated from the user
    function claim(bytes32 id, string memory password, address _recipient, bytes32 validation) 
    public returns (uint claimed) {

        RedPacket storage rp = redpacket_by_id[id];
        address payable recipient = address(uint160(_recipient));
        // uint256 token_id;
        // Unsuccessful
        require (unbox(rp.packed1, 224, 32) > now, "Expired");
        uint total_number = unbox(rp.packed2, 232, 8);
        uint claimed_number = unbox(rp.packed2, 224, 8);
        require (claimed_number < total_number, "Out of stock");
        // require (1 > 2, 'test');
        require (uint256(keccak256(bytes(password))) >> 128 == unbox(rp.packed1, 0, 128), "Wrong password");
        require (validation == keccak256(toBytes(msg.sender)), "Validation failed");

        uint claimed_tokens;
        uint256 token_type = unbox(rp.packed2, 240, 8);
        uint ifrandom = unbox(rp.packed2, 248, 8);
        uint total_tokens = unbox(rp.packed1, 128, 96);
        // Todo get erc721 token id;
        if (ifrandom == 1) {
            if (total_number - claimed_number == 1){
                claimed_tokens = total_tokens;
            }
            else {
                claimed_tokens = random(seed, nonce) % SafeMath.div(SafeMath.mul(total_tokens, 2), total_number - claimed_number);
            }
            if (claimed_tokens == 0) {
                claimed_tokens = 1;
            }
            rp.packed1 = rewriteBox(rp.packed1, 128, 96, total_tokens - claimed_tokens);
        }
        else {
            if (total_number - claimed_number == 1){
                claimed_tokens = total_tokens;
            }
            else{
                claimed_tokens = SafeMath.div(total_tokens, (total_number - claimed_number));
            }

            rp.packed1 = rewriteBox(rp.packed1, 128, 96, total_tokens - claimed_tokens);
        }

        // Penalize greedy attackers by placing duplication check at the very last
        bool available = false;
        for (uint i = 0; i < unbox(rp.packed2, 224, 8); i ++) {
            if (unbox(rp.claimed_list[i / 4], uint16(64*(i%4)), 64) == (uint256(keccak256(abi.encodePacked(msg.sender))) >> 192)) {
                available = true;
                break;
            }
        }
        require (available == false, "Already claimed");

        rp.claimed_list[claimed_number / 4] = rewriteBox(rp.claimed_list[claimed_number / 4], 64 * uint16(claimed_number % 4), 64, (uint256(keccak256(abi.encodePacked(msg.sender))) >> 192));
        rp.packed2 = rewriteBox(rp.packed2, 224, 8, claimed_number + 1);


        // Transfer the red packet after state changing
        if (token_type == 0) {
            recipient.transfer(claimed_tokens);
        }
        else if (token_type == 1) {
            transfer_token(address(unbox(rp.packed2, 0, 160)), address(this),
                            recipient, claimed_tokens);
        }

        // Claim success event
        emit ClaimSuccess(id, recipient, claimed_tokens, address(unbox(rp.packed2, 0, 160)));
        return claimed_tokens;
    }

    // Returns 1. remaining value 2. total number of red packets 3. claimed number of red packets
    function check_availability(bytes32 id) external view returns (address token_address, uint balance, uint total, 
                                                                    uint claimed, bool expired, bool ifclaimed) {
        RedPacket storage rp = redpacket_by_id[id];
        ifclaimed = false;
        uint256 sender_hash = (uint256(keccak256(abi.encodePacked(msg.sender))) >> 192);
        uint256 number = unbox(rp.packed2, 224, 8);
        for (uint i = 0; i < number; i ++) {
            if (unbox(rp.claimed_list[i / 4], uint16(64*(i%4)), 64) == sender_hash) {
                ifclaimed = true;
                break;
            }
        }
        return (address(unbox(rp.packed2, 0, 160)), unbox(rp.packed1, 128, 96), unbox(rp.packed2, 232, 8), unbox(rp.packed2, 224, 8), now > unbox(rp.packed1, 224, 32), ifclaimed);
    }

    function refund(bytes32 id) public {
        RedPacket storage rp = redpacket_by_id[id];
        require(uint256(keccak256(abi.encodePacked(msg.sender)) >> 192) == unbox(rp.packed2, 160, 64), "Creator Only");
        require(unbox(rp.packed1, 224, 32) <= now, "Not expired yet");

        uint256 remaining_tokens = unbox(rp.packed1, 128, 96);
        require(remaining_tokens != 0, "None left in the red packet.");

        uint256 token_type = unbox(rp.packed2, 240, 8);
        address token_address = address(unbox(rp.packed2, 0, 160));

        if (token_type == 0) {
            msg.sender.transfer(remaining_tokens);
        }
        else if (token_type == 1) {
            IERC20(token_address).approve(msg.sender, remaining_tokens);
            transfer_token(token_address, address(this),
                            msg.sender, remaining_tokens);
        }

        emit RefundSuccess(id, token_address, remaining_tokens);
        // Gas Refund
        rp.packed1 = 0;
        rp.packed2 = 0;
        for (uint i = 0; i < rp.claimed_list.length; i++){
            rp.claimed_list[i] = 0;
        }
    }

//------------------------------------------------------------------

    function box (uint16 position, uint16 size, uint256 data) internal pure returns (uint256 boxed) {
        require(validRange(size, data), "Value out of range BOX");
        return data << (256 - size - position);
    }

    function unbox (uint256 base, uint16 position, uint16 size) internal pure returns (uint256 unboxed) {
        require(validRange(256, base), "Value out of range UNBOX");
        return (base << position) >> (256 - size);
    }

    function validRange(uint16 size, uint256 data) public pure returns(bool) { 
        if (data > 2 ** uint256(size) - 1) {
            return false;
        } else {
            return true;
        }
    }

    function rewriteBox(uint256 _box, uint16 position, uint16 size, uint256 data) internal pure returns (uint256 boxed) {

        uint256 _boxData = box(position, size, data);
        uint256 _mask = box(position, size, uint256(-1) >> (256 - size));
        _box = (_box & ~_mask) | _boxData;
        return _box;
    }

    // Check the balance of the given token
    function transfer_token(address token_address, address sender_address,
                            address recipient_address, uint amount) internal{
        require(IERC20(token_address).balanceOf(sender_address) >= amount, "Balance too low");
        IERC20(token_address).safeTransfer(recipient_address, amount);
    }
    
    // A boring wrapper
    function random(bytes32 _seed, uint32 nonce_rand) internal view returns (uint rand) {
        return uint(keccak256(abi.encodePacked(nonce_rand, msg.sender, _seed, now))) + 1 ;
    }
    
    // https://ethereum.stackexchange.com/questions/884/how-to-convert-an-address-to-bytes-in-solidity
    // 695 gas consumed
    function toBytes(address a) public pure returns (bytes memory b) {
        assembly {
            let m := mload(0x40)
            a := and(a, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
            mstore(add(m, 20), xor(0x140000000000000000000000000000000000000000, a))
            mstore(0x40, add(m, 52))
            b := m
        }
    }

    function wrap1 (bytes32 _hash, uint _total_tokens, uint _duration) internal view returns (uint256 packed1) {
        uint256 _packed1 = 0;
        _packed1 |= box(0, 128, uint256(_hash) >> 128); // hash = 128 bits (NEED TO CONFIRM THIS)
        _packed1 |= box(128, 96, _total_tokens);        // total tokens = 80 bits = ~8 * 10^10 18 decimals
        _packed1 |= box(224, 32, (now + _duration));    // expiration_time = 32 bits (until 2106)
        return _packed1;
    }

    function wrap2 (address _token_addr, uint _number, uint _token_type, uint _ifrandom) internal view returns (uint256 packed2) {
        uint256 _packed2 = 0;
        _packed2 |= box(0, 160, uint256(_token_addr));  // token_address = 160 bits
        _packed2 |= box(160, 64, (uint256(keccak256(abi.encodePacked(msg.sender))) >> 192));  // creator.hash = 64 bit
        _packed2 |= box(224, 8, 0);                     // claimed_number = 8 bits
        _packed2 |= box(232, 8, _number);               // total_ number = 8 bits
        _packed2 |= box(240, 8, _token_type);           // token_type = 8 bits
        _packed2 |= box(248, 8, _ifrandom);             // ifrandom = 1 bit 
        return _packed2;
    }

}
