pragma solidity ^0.6;
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract HappyRedPacket {

    struct RedPacket {
        uint256 packed1;            // exp(48) total_tokens(80) hash(64) id(64) BIG ENDIAN
        uint256 packed2;            // ifrandom(1) token_type(8) total_number(8) claimed(8) creator(64) token_addr(160)
        uint256[] erc721_token_ids;
        mapping(address => bool) claimed;
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

        if (_token_type == 0) {
            require(msg.value >= _total_tokens, "008");
        }
        else if (_token_type == 1) {
            require(IERC20(_token_addr).allowance(msg.sender, address(this)) >= _total_tokens, "009");
            transfer_token(_token_type, _token_addr, msg.sender, address(this), _total_tokens, new uint256[](0));
        }
        else if (_token_type == 2) {
            require(IERC721(_token_addr).isApprovedForAll(msg.sender, address(this)), "011");
            transfer_token(_token_type, _token_addr, msg.sender, address(this), _total_tokens, _erc721_token_ids);
            // IERC721(_token_addr).setApprovalForAll(address(this), false);
        }

        bytes32 _id = keccak256(abi.encodePacked(msg.sender, now, nonce, seed, _seed));
        RedPacket storage redp = redpacket_by_id[_id];
        wrap1(redp, _hash, _total_tokens, _duration);
        wrap2(redp, _token_addr, msg.sender, _number, _token_type);
        redp.erc721_token_ids = _erc721_token_ids;
        emit CreationSuccess(_total_tokens, _id, _name, _message, msg.sender, now, _token_addr, _erc721_token_ids);
    }

    function wrap1 (RedPacket storage rp, bytes32 _hash, uint _total_tokens, uint _duration) internal {
        rp.packed1 = 0;
        box(rp.packed1, 0, 128, uint256(_hash) >> 128);    // hash = 128 bits (NEED TO CONFIRM THIS)
        box(rp.packed1, 128, 80, _total_tokens);        // total tokens = 80 bits = ~10^24.1 = ~10^6 18 decimals
        box(rp.packed1, 208, 48, (now + _duration));    // expiration_time = 48 bits (to the end of the world)
    }

    function wrap2 (RedPacket storage rp, address _token_addr, address _creator, uint _number, uint _token_type) internal {
        rp.packed2 = 0;
        box(rp.packed2, 0, 160, uint256(_token_addr));   // token_address = 160 bits
        box(rp.packed2, 160, 64, (uint256(keccak256(abi.encodePacked(msg.sender))) >> 192));  // creator.hash = 64 bit
        box(rp.packed2, 224, 8, 0);                     // claimed_number = 8 bits
        box(rp.packed2, 232, 8, _number);               // total_ number = 8 bits
        box(rp.packed2, 240, 8, _token_type);           // token_type = 8 bits
        box(rp.packed2, 248, 8, 1);     // ifrandom = 1 bit 
    }

    function box (uint256 base, uint8 position, uint8 size, uint256 data) internal pure {
        base |= (data & (uint256(-1) >> (256 - size))) << position;
    }

    function unbox (uint256 base, uint8 position, uint8 size) internal pure returns (uint256 unboxed) {
        return (base >> position) & (uint256(-1) >> (256 - size));
    }

    // Check the balance of the given token
    function transfer_token(uint token_type, address token_address, address sender_address,
                            address recipient_address, uint amount, uint256 [] memory erc721_token_ids) public payable{
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
        array[array.length - 1] = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
        return array;
    }

    // It takes the unhashed password and a hashed random seed generated from the user
    function claim(bytes32 id, string memory password, address _recipient, bytes32 validation) 
    public returns (uint claimed) {


        RedPacket storage rp = redpacket_by_id[id];
        address payable recipient = address(uint160(_recipient));
        // uint256 token_id;
        // Unsuccessful
        //require (rp.packed1 >> 208 & 0xffffffffffff > now, "003");
        //require (uint8(rp.packed2 >> 224) < uint8(rp.packed2 >> 232), "004");
        // Penalize greedy attackers by placing duplication check at the very last
        require (rp.claimed[recipient] == false, "005");
        require (uint256(keccak256(bytes(password))) >> 192 == (rp.packed1 >> 64 & 0xffffffffffffffff), "006");
        require (validation == keccak256(toBytes(msg.sender)), "007");

        uint claimed_tokens;
        uint256 [] memory token_ids = new uint256[](1); //TODO: Optimize this behavior.
        // Todo get erc721 token id;
        uint256 token_type = rp.packed2 >> 240 & 0xff;
        if (rp.packed2 >> 248 & 0xff == 1) {
            if (token_type == 2) {
                uint token_id_index = random(seed, nonce) % (rp.packed1 >> 128 & 0xffffffffffffffffffff);
                uint256[] memory _array = rp.erc721_token_ids;
                token_ids[0] = _array[token_id_index];
                rp.erc721_token_ids = getTokenIdWithIndex(_array, token_id_index);
                claimed_tokens = 1;
                rp.packed1 |= (rp.packed1 >> 128 & 0xffffffffffffffffffff - 1) << 128;
            }
            else
            {
                if ((rp.packed2 >> 232 & 0xff) - (rp.packed2 >> 224 & 0xff) == 1){
                    claimed_tokens = rp.packed1 >> 128 & 0xffffffffffffffffffff;
                }
                else{
                    //claimed_tokens = random(seed, nonce) % SafeMath.mul(SafeMath.div(rp.packed1 >> 128 & 0xffffffffffffffffffff, (rp.packed2 >> 232 & 0xff) - (rp.packed2 >> 224 & 0xff)), 2);     //Max amount of tokens that can be claimed once is average * 2
                    claimed_tokens = random(seed, nonce) % SafeMath.mul(SafeMath.div(rp.packed1 >> 128, (rp.packed2 >> 232) - (rp.packed2 >> 224)), 2);
                }
                rp.packed1 |= ((rp.packed1 >> 128 & 0xffff) - claimed_tokens) << 128;
            }
        }
        else {
            if (rp.packed2 >> 248 == 2) {
                // token_id_index = random(seed, nonce) % rp.remaining_tokens;
                uint256[] memory _array = rp.erc721_token_ids;
                token_ids[0] = rp.erc721_token_ids[0];
                rp.erc721_token_ids = getTokenIdWithIndex(_array, 0);
                claimed_tokens = 1;
                rp.packed1 |= ((rp.packed1 >> 128 & 0xffff) - 1) << 128;
            }
            else
            {
                if ((rp.packed2 >> 232 & 0xff) - (rp.packed2 >> 224 & 0xff) == 1){
                    claimed_tokens = rp.packed1 >> 128 & 0xffffffffffffffffffff;
                }
                else{
                    claimed_tokens = random(seed, nonce) % SafeMath.mul(SafeMath.div(rp.packed1 >> 128, (rp.packed2 >> 232) - (rp.packed2 >> 224)), 2);
                }
                rp.packed1 |= ((rp.packed1 >> 128) & 0xffff - claimed_tokens) << 128;
            }
        }

//        require(1 > 2);

        // Change the state
        rp.claimed[recipient] = true;
        rp.packed2 |= ((rp.packed2 >> 224 & 0xff) + 1) << 224;


        // Transfer the red packet after state changing
        if (rp.packed2 >> 248 == 0) {
            recipient.transfer(claimed_tokens);
        }
        else if (rp.packed2 >> 248 == 1) {
            uint256 [] memory token_ids_holder = new uint256[](0); 
            transfer_token(rp.packed2 >> 240 & 0xff, address(uint160(rp.packed2 & 0xffffffffffffffffffff)), address(this),
                            recipient, claimed_tokens, token_ids_holder);
        }
        else if (rp.packed2 >> 248 == 2) {
            transfer_token(rp.packed2 >> 240 & 0xff, address(uint160(rp.packed2 & 0xffffffffffffffffffff)), address(this),
                            recipient, claimed_tokens, token_ids);
        }

        // Claim success event
        emit ClaimSuccess(bytes32(rp.packed1 & 0xffffffffffffffff), recipient, claimed_tokens, address(uint160(rp.packed2 & 0xffffffffffffffffffff)), token_ids);
        return claimed_tokens;
    }

    // Returns 1. remaining value 2. total number of red packets 3. claimed number of red packets
    function check_availability(bytes32 id) public view returns (address token_address, uint balance, uint total, 
                                                                    uint claimed, bool expired, bool ifclaimed) {
        RedPacket storage rp = redpacket_by_id[id];
        return (address(uint160(rp.packed2 & 0xffffffffffffffffffff)), rp.packed1 >> 128 & 0xffffffffffffffffffff, rp.packed2 >> 232 & 0xff, rp.packed2 >> 240 & 0xff, now > rp.packed1 >> 208 & 0xffffffffffff, rp.claimed[msg.sender]);
    }

    // Returns a list of claiming token id
    function check_erc721_token_ids(bytes32 id) public view returns (uint256[] memory erc721_token_ids) {
        RedPacket storage rp = redpacket_by_id[id];
        return (rp.erc721_token_ids);
    }
/*
    function refund(bytes32 id) public {
        RedPacket storage rp = redpacket_by_id[id];
        require(uint256(keccak256(abi.encodePacked(msg.sender)) >> 192) == rp.packed2 >> 64 & 0xffffffffffffffff, "011");
        require(rp.packed >> 208 & 0xffffffffffff < now, "012");

        uint256 remainin_tokens = rp.packed1 >> 128 & 0xffffffffffffffffffff;
        if (rp.packed2 >> 248 == 0) {
            msg.sender.transfer(remaining_tokens);
        }
        else if (rp.packed2 >> 248 == 1) {
            uint256[] memory token_ids_holder = new uint256[](0); 
            IERC20(rp.token_address).approve(msg.sender, rp.remaining_tokens);
            transfer_token(rp.token_type, rp.token_address, address(this),
                            msg.sender, rp.remaining_tokens, token_ids_holder);
        }
        else if (rp.token_type == 2) {
            uint256[] memory token_ids;
            for (uint i = 0; i < rp.erc721_token_ids.length - 1; i++){
                if (rp.erc721_token_ids[i] != 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) {
                    token_ids[token_ids.length] = rp.erc721_token_ids[i];
                }
            }
            // IERC721(rp.token_address).approve(msg.sender, rp.remaining_tokens);
            transfer_token(rp.token_type, rp.token_address, address(this),
                            msg.sender, rp.remaining_tokens, token_ids); 
        }

        emit RefundSuccess(rp.id, rp.token_address, rp.remaining_tokens);
        rp.remaining_tokens = 0;
    }
*/

    // One cannot send tokens to this contract after constructor anymore
    // function () external payable {
    // }
}
