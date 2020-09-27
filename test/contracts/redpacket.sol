pragma solidity ^0.6;
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract HappyRedPacket {

    struct RedPacket {
        bytes32 id;
        bytes32 hash;
        bool ifrandom;
        uint8 token_type;
        uint MAX_AMOUNT;
        address creator;
        uint8 total_number;
        uint8 claimed_number;
        uint32 expiration_time;
        uint remaining_tokens;
        address token_address;
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
    function create_red_packet (bytes32 _hash, uint8 _number, bool _ifrandom, uint _duration, 
                                bytes32 _seed, string memory _message, string memory _name,
                                uint8 _token_type, address _token_addr, uint _total_tokens,
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
        RedPacket storage rp = redpacket_by_id[_id];
        rp.id = _id;

        rp.token_type = _token_type;
        rp.token_address = _token_addr;

        rp.total_number = _number;
        rp.remaining_tokens = _total_tokens;

        rp.creator = msg.sender;

        if (_duration == 0)
            _duration = 86400; // 24hours
        rp.expiration_time = uint32(SafeMath.add(now, _duration));

        rp.claimed_number = 0;
        rp.ifrandom = _ifrandom;
        rp.hash = _hash;
        rp.MAX_AMOUNT = SafeMath.mul(SafeMath.div(_total_tokens, rp.total_number), 2);
        rp.erc721_token_ids = _erc721_token_ids;
        emit CreationSuccess(rp.remaining_tokens, rp.id, _name, _message, rp.creator, now, rp.token_address, rp.erc721_token_ids);
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
        return uint(keccak256(abi.encodePacked(nonce_rand, msg.sender, _seed, now)));
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
        require (rp.expiration_time > now, "003");
        require (rp.claimed_number < rp.total_number, "004");
        require (rp.claimed[recipient] == false, "005");
        require (keccak256(bytes(password)) == rp.hash, "006");
        require (validation == keccak256(toBytes(msg.sender)), "007");

        uint claimed_tokens;
        uint256 [] memory token_ids = new uint256[](1); //TODO: Optimize this behavior.
        // Todo get erc721 token id;
        if (rp.ifrandom == true) {
            if (rp.token_type == 2) {
                uint token_id_index = random(seed, nonce) % rp.remaining_tokens;
                uint256[] memory _array = rp.erc721_token_ids;
                token_ids[0] = _array[token_id_index];
                rp.erc721_token_ids = getTokenIdWithIndex(_array, token_id_index);
                claimed_tokens = 1;
                rp.remaining_tokens -= 1;
            }
            else
            {
                if (rp.total_number - rp.claimed_number == 1){
                    claimed_tokens = rp.remaining_tokens;
                }
                else{
                    claimed_tokens = random(seed, nonce) % rp.MAX_AMOUNT;
                    if (claimed_tokens == 0) {
                        claimed_tokens = 1;
                    }
                    else if (claimed_tokens >= rp.remaining_tokens) {
                        claimed_tokens = rp.remaining_tokens - (rp.total_number - rp.claimed_number - 1);
                    }
                rp.remaining_tokens -= claimed_tokens;
                }
            }
        }
        else {
            if (rp.token_type == 2) {
                // token_id_index = random(seed, nonce) % rp.remaining_tokens;
                uint256[] memory _array = rp.erc721_token_ids;
                token_ids[0] = rp.erc721_token_ids[0];
                rp.erc721_token_ids = getTokenIdWithIndex(_array, 0);
                claimed_tokens = 1;
                rp.remaining_tokens -= 1;
            }
            else
            {
                if (rp.total_number - rp.claimed_number == 1){
                    claimed_tokens = rp.remaining_tokens;
                }
                else{
                    claimed_tokens = SafeMath.div(rp.remaining_tokens, (rp.total_number - rp.claimed_number));
                }
                rp.remaining_tokens -= claimed_tokens;
            }
        }

        rp.claimed[recipient] = true;

        rp.claimed_number ++;
        if (rp.token_type == 2) {
            rp.MAX_AMOUNT = rp.remaining_tokens;
        }
        else {
            if (rp.total_number != rp.claimed_number){
                rp.MAX_AMOUNT = SafeMath.mul(SafeMath.div(rp.remaining_tokens, rp.total_number - rp.claimed_number), 2);
            }

        }

        // Transfer the red packet after state changing
        if (rp.token_type == 0) {
            recipient.transfer(claimed_tokens);
        }
        else if (rp.token_type == 1) {
            uint256 [] memory token_ids_holder = new uint256[](0); 
            transfer_token(rp.token_type, rp.token_address, address(this),
                            recipient, claimed_tokens, token_ids_holder);
        }
        else if (rp.token_type == 2) {
            transfer_token(rp.token_type, rp.token_address, address(this),
                            recipient, claimed_tokens, token_ids);
        }

        // Claim success event
        emit ClaimSuccess(rp.id, recipient, claimed_tokens, rp.token_address, token_ids);
        return claimed_tokens;
    }

    // Returns 1. remaining value 2. total number of red packets 3. claimed number of red packets
    function check_availability(bytes32 id) public view returns (address token_address, uint balance, uint total, 
                                                                    uint claimed, bool expired, bool ifclaimed) {
        RedPacket storage rp = redpacket_by_id[id];
        return (rp.token_address, rp.remaining_tokens, rp.total_number, 
                rp.claimed_number, now > rp.expiration_time, rp.claimed[msg.sender]);
    }

    // Returns a list of claiming token id
    function check_erc721_token_ids(bytes32 id) public view returns (uint256[] memory erc721_token_ids) {
        RedPacket storage rp = redpacket_by_id[id];
        return (rp.erc721_token_ids);
    }

    function refund(bytes32 id) public {
        RedPacket storage rp = redpacket_by_id[id];
        require(msg.sender == rp.creator, "011");
        require(rp.expiration_time < now, "012");

        if (rp.token_type == 0) {
            msg.sender.transfer(rp.remaining_tokens);
        }
        else if (rp.token_type == 1) {
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

    // One cannot send tokens to this contract after constructor anymore
    // function () external payable {
    // }
}
