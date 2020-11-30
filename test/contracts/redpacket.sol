pragma solidity 0.6.2;
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract HappyRedPacket {

    struct RedPacket {
        uint256 packed1;            // exp(48) total_tokens(80) hash(64) id(64) BIG ENDIAN
        uint256 packed2;            // ifrandom(1) token_type(8) total_number(8) claimed(8) creator(64) token_addr(160)
        uint256[] erc721_token_ids;
        uint256[] claimed_list;
    }

    event CreationSuccess(
        uint total,
        bytes32 id,
        string name,
        string message,
        address creator,
        uint creation_time,
        address token_address,
        uint256[] erc721_token_ids
    );

    event ClaimSuccess(
        bytes32 id,
        address claimer,
        uint claimed_value,
        address token_address,
        uint256[] token_id
    );

    event RefundSuccess(
        bytes32 id,
        address token_address,
        uint remaining_balance
    );

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
    // _token_type: 0 - ETH 1 - ERC20 2 - ERC721
    function create_red_packet (bytes32 _hash, uint _number, bool _ifrandom, uint _duration, 
                                bytes32 _seed, string memory _message, string memory _name,
                                uint _token_type, address _token_addr, uint _total_tokens,
                                uint256[] memory _erc721_token_ids) 
    public payable {
        nonce ++;
        require(_total_tokens >= _number, "001");
        require(_number > 0, "002");
        require(_number < 256, "002");

        if (_token_type == 0) {
            require(msg.value >= _total_tokens, "008");
        }
        else if (_token_type == 1) {
            require(IERC20(_token_addr).allowance(msg.sender, address(this)) >= _total_tokens, "009");
            IERC20(_token_addr).transferFrom(msg.sender, address(this), _total_tokens);
        }
        else if (_token_type == 2) {
            require(IERC721(_token_addr).isApprovedForAll(msg.sender, address(this)), "011");
            transfer_token(_token_type, _token_addr, msg.sender, address(this), _total_tokens, _erc721_token_ids);
        }

        bytes32 _id = keccak256(abi.encodePacked(msg.sender, now, nonce, seed, _seed));
        uint _random_type = _ifrandom ? 1 : 0;
        RedPacket storage redp = redpacket_by_id[_id];
        redp.packed1 = wrap1(_hash, _total_tokens, _duration);
        redp.packed2 = wrap2(_token_addr, _number, _token_type, _random_type);
        redp.erc721_token_ids = _erc721_token_ids;
        redp.claimed_list = new uint256[]((_number-1)/4 + 1);
        emit CreationSuccess(_total_tokens, _id, _name, _message, msg.sender, now, _token_addr, _erc721_token_ids);
    }

    function wrap1 (bytes32 _hash, uint _total_tokens, uint _duration) internal view returns (uint256 packed1) {
        uint256 _packed1 = 0;
        _packed1 |= box(0, 128, uint256(_hash) >> 128); // hash = 128 bits (NEED TO CONFIRM THIS)
        _packed1 |= box(128, 80, _total_tokens);        // total tokens = 80 bits = ~10^24.1 = ~10^6 18 decimals
        _packed1 |= box(208, 48, (now + _duration));    // expiration_time = 48 bits (to the end of the world)
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
    function transfer_token(uint token_type, address token_address, address sender_address,
                            address recipient_address, uint amount, uint256 [] memory erc721_token_ids) internal{
        // ERC20
        if (token_type == 1) {
            require(IERC20(token_address).balanceOf(sender_address) >= amount, "010");
            IERC20(token_address).approve(sender_address, amount);
            IERC20(token_address).transferFrom(sender_address, recipient_address, amount);
        }

        // ERC721
        else if (token_type == 2) {
            require(IERC721(token_address).balanceOf(sender_address) >= amount, "012");
            for (uint i=0; i < amount; i++) {
                if (recipient_address == address(this)){
                    IERC721(token_address).approve(recipient_address, erc721_token_ids[i]);
                }
                IERC721(token_address).transferFrom(sender_address, recipient_address, erc721_token_ids[i]);
            }
        }

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

    function getTokenIdWithIndex(uint256[] memory array, uint index) internal pure returns(uint256[] memory) {
        if (index >= array.length) return array;
        for (uint i = index; i < array.length - 1; i++){
            array[i] = array[i + 1];
        }
        array[array.length - 1] = MASK;
        return array;
    }

    // It takes the unhashed password and a hashed random seed generated from the user
    function claim(bytes32 id, string memory password, address _recipient, bytes32 validation) 
    public returns (uint claimed) {


        RedPacket storage rp = redpacket_by_id[id];
        address payable recipient = address(uint160(_recipient));
        // uint256 token_id;
        // Unsuccessful
        require (unbox(rp.packed1, 208, 48) > now, "003");
        uint total_number = unbox(rp.packed2, 232, 8);
        uint claimed_number = unbox(rp.packed2, 224, 8);
        require (claimed_number < total_number, "004");
        // require (1 > 2, 'test');
        require (uint256(keccak256(bytes(password))) >> 128 == unbox(rp.packed1, 0, 128), "006");
        require (validation == keccak256(toBytes(msg.sender)), "007");

        uint claimed_tokens;
        uint256 [] memory token_ids = new uint256[](1); //TODO: Optimize this behavior.
        uint256 token_type = unbox(rp.packed2, 240, 8);
        uint ifrandom = unbox(rp.packed2, 248, 8);
        uint total_tokens = unbox(rp.packed1, 128, 80);
        // Todo get erc721 token id;
        if (ifrandom == 1) {
            if (token_type == 2) {
                uint token_id_index = random(seed, nonce) % (total_tokens);
                uint256[] memory _array = rp.erc721_token_ids;
                token_ids[0] = _array[token_id_index];
                rp.erc721_token_ids = getTokenIdWithIndex(_array, token_id_index);
                claimed_tokens = 1;
                rp.packed1 = rewriteBox(rp.packed1, 128, 80, total_tokens - 1);
            }
            else
            {
                if (total_number - claimed_number == 1){
                    claimed_tokens = total_tokens;
                }
                else{
                    claimed_tokens = random(seed, nonce) % SafeMath.div(SafeMath.mul(total_tokens, 2), total_number - claimed_number);
                }
                if (claimed_tokens == 0) {
                    claimed_tokens = 1;
                }
                rp.packed1 = rewriteBox(rp.packed1, 128, 80, total_tokens - claimed_tokens);
            }
        }
        else {
            if (token_type == 2) {
                // token_id_index = random(seed, nonce) % rp.remaining_tokens;
                uint256[] memory _array = rp.erc721_token_ids;
                token_ids[0] = rp.erc721_token_ids[0];
                rp.erc721_token_ids = getTokenIdWithIndex(_array, 0);
                claimed_tokens = 1;
                rp.packed1 = rewriteBox(rp.packed1, 128, 80, total_tokens - 1);
                // rp.packed1 |= ((rp.packed1 >> 128 & 0xffff) - 1) << 128;
            }
            else
            {
                if (total_number - claimed_number == 1){
                    claimed_tokens = total_tokens;
                }
                else{
                    claimed_tokens = SafeMath.div(total_tokens, (total_number - claimed_number));
                }

                rp.packed1 = rewriteBox(rp.packed1, 128, 80, total_tokens - claimed_tokens);
            }
        }

        // Penalize greedy attackers by placing duplication check at the very last
        bool available = false;
        for (uint i = 0; i < unbox(rp.packed2, 224, 8); i ++) {
            if (unbox(rp.claimed_list[i / 4], uint16(64*(i%4)), 64) == (uint256(keccak256(abi.encodePacked(msg.sender))) >> 192)) {
                available = true;
                break;
            }
        }
        require (available == false, "005");

        rp.claimed_list[claimed_number / 4] = rewriteBox(rp.claimed_list[claimed_number / 4], 64 * uint16(claimed_number % 4), 64, (uint256(keccak256(abi.encodePacked(msg.sender))) >> 192));
        rp.packed2 = rewriteBox(rp.packed2, 224, 8, claimed_number + 1);


        // Transfer the red packet after state changing
        if (token_type == 0) {
            recipient.transfer(claimed_tokens);
        }
        else if (token_type == 1) {
            uint256 [] memory token_ids_holder = new uint256[](0); 
            transfer_token(token_type, address(unbox(rp.packed2, 0, 160)), address(this),
                            recipient, claimed_tokens, token_ids_holder);
        }
        else if (token_type == 2) {
            transfer_token(token_type, address(unbox(rp.packed2, 0, 160)), address(this),
                            recipient, claimed_tokens, token_ids);
        }

        // Claim success event
        emit ClaimSuccess(id, recipient, claimed_tokens, address(unbox(rp.packed2, 0, 160)), token_ids);
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
        return (address(unbox(rp.packed2, 0, 160)), unbox(rp.packed1, 128, 80), unbox(rp.packed2, 232, 8), unbox(rp.packed2, 224, 8), now > unbox(rp.packed1, 208, 48), ifclaimed);
    }

    // Returns a list of claiming token id
    function check_erc721_token_ids(bytes32 id) external view returns (uint256[] memory erc721_token_ids) {
        RedPacket storage rp = redpacket_by_id[id];
        return (rp.erc721_token_ids);
    }

    function refund(bytes32 id) public {
        RedPacket storage rp = redpacket_by_id[id];
        require(uint256(keccak256(abi.encodePacked(msg.sender)) >> 192) == unbox(rp.packed2, 160, 64), "011");
        require(unbox(rp.packed1, 208, 48) <= now, "012");

        uint256 remaining_tokens = unbox(rp.packed1, 128, 80);
        uint256 token_type = unbox(rp.packed2, 240, 8);
        address token_address = address(unbox(rp.packed2, 0, 160));

        if (token_type == 0) {
            msg.sender.transfer(remaining_tokens);
        }
        else if (token_type == 1) {
            uint256[] memory token_ids_holder = new uint256[](0);
            IERC20(token_address).approve(msg.sender, remaining_tokens);
            transfer_token(token_type, token_address, address(this),
                            msg.sender, remaining_tokens, token_ids_holder);
        }
        else if (token_type == 2) {
            uint256[] memory token_ids = new uint256[](remaining_tokens);
            uint j = 0;
            for (uint i = 0; i < rp.erc721_token_ids.length; i++){
                if (rp.erc721_token_ids[i] != MASK) {
                    token_ids[j++] = rp.erc721_token_ids[i];
                    rp.erc721_token_ids[i] = MASK;
                }
            }
            IERC721(token_address).approve(msg.sender, remaining_tokens);
            transfer_token(token_type, token_address, address(this),
                            msg.sender, remaining_tokens, token_ids); 
        }

        emit RefundSuccess(id, token_address, remaining_tokens);
        rp.packed1 = rewriteBox(rp.packed1, 128, 80, 0);
        // Gas Refund
        rp.packed1 = 0;
        rp.packed2 = 0;
        for (uint i = 0; i < rp.erc721_token_ids.length; i++){
            rp.erc721_token_ids[i] = 0;
        }
        for (uint i = 0; i < rp.claimed_list.length; i++){
            rp.claimed_list[i] = 0;
        }
    }

     // One cannot send tokens to this contract after constructor anymore
     function () external payable {
     }
}
