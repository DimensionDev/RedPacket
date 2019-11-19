pragma solidity >0.4.22;

contract RedPacket{

    struct Claimer{
        uint index;
        address addr; 
        uint claimed_value;
        uint claimed_time;
    }

    event CreationSuccess(
        address creator,
        uint total
    );
    
    event ClaimSuccess(
        address claimer,
        uint claimed_value
    );

    event ReadVariable(
        uint amount
    );

    event Bad(
        bytes32 hash;        
    );

    //1 ETH = 1000000000000000000(10^18) WEI
    uint constant min_amount = 1000 * 1000;
    uint constant max_amount = 1 * 10**18;

    bool random;
    uint remaining_value;
    uint expiration;
    address creator;
    uint total_number;
    uint claimed_number; // nonce
    string claimed_list_str;
    bytes32[] public hashes;
    Claimer[] public claimers;

    // Inits a red packet instance
    constructor (bytes32[] memory _hashes, bool ifrandom, uint expiration_time) public payable {
        require(msg.value > 0, "You need to insert some money to your red packet.");
        require(_hashes.length > 0, "At least 1 person can claim the red packet.");
        require(expiration_time > now, "You need to set the expiration time to future.");
        
        expiration = expiration_time;
        claimed_list_str = "";
        creator = msg.sender;
        claimed_number = 0;
        total_number = _hashes.length;
        remaining_value = msg.value;
        random = ifrandom;
        for (uint i = 0; i < total_number; i++){
            hashes.push(_hashes[i]);
        }
        emit CreationSuccess(creator, remaining_value);
    }

    // Skeleton
    // Here I am planning to adopt an interactive way of generating randint
    // This should be only used in claim()
    function random_value(bytes32 seed) internal view returns (uint){
        return uint(keccak256(abi.encodePacked(claimed_number, msg.sender, seed)));
    }

    // uint2str from https://github.com/provable-things/ethereum-api/blob/master/oraclizeAPI_0.5.sol
    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len - 1;
        while (_i != 0) {
            bstr[k--] = byte(uint8(48 + _i % 10));
            _i /= 10;
        }
        return string(bstr);
    }

    // address to string
    function addr2str(address x) internal pure returns (string memory) {
        bytes memory b = new bytes(20);
        for (uint i = 0; i < 20; i++)
            b[i] = byte(uint8(uint(x) / (2**(8*(19 - i)))));
        return string(b);
    }
   
    // It takes the unhashed password and a hashed random seed generated from the user
    function claim(string memory password, bytes32 seed) public returns (uint){
        // Unsuccessful
        require (claimed_number < total_number, "Out of Stock.");
        for (uint i = 0; i < claimers.length; i++){
            // Bad bad
            require (msg.sender != claimers[i].addr, "Already Claimed.");
        }
        uint claimed_value;
        if (keccak256(abi.encode(password)) == hashes[claimed_number]){
            claimed_value = random_value(seed) % remaining_value + 1;  //[1,remaining_value]
            emit ReadParameter(claimed_value);
            msg.sender.transfer(claimed_value);
            claimed_number ++;
            claimers.push(Claimer({index: claimed_number, addr: msg.sender, claimed_value: claimed_value, claimed_time: now}));
            // Simple string concat is not supported in Solidity
            // Pending feature
            //claimed_list_str += addr2str(msg.sender) + ": " + uint2str(claimed_value) + "\n";
            emit ClaimSuccess(msg.sender, claimed_value);
        }
        else{
            emit Bad(keccak256(abi.encode(password)));
        }
        return claimed_value;
    }
    
    // Returns 1. remaining number of red packets 2. claimed list
    function check_availability() public view returns (uint, uint){
        return (remaining_value, total_number - claimed_number);
    }

    function () external payable {
    }
}
