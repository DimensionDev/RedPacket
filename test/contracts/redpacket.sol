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

    event Failure(
        bytes32 hash1,
        bytes32 hash2
    );

    //1 ETH = 1000000000000000000(10^18) WEI
    uint constant min_amount = 1 * 10**15;  //0.001 ETH
    //uint constant max_amount = 1 * 10**18;

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
        if (expiration_time <= now){
            expiration_time = now + 5760;   //default set to (60/15) * 60 * 60 = 5760 blocks, which is approximately 24 hours
        }
        require(msg.value > min_amount, "You need to insert some money to your red packet.");
        require(_hashes.length > 0, "At least 1 person can claim the red packet.");
       
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

    // An interactive way of generating randint
    // This should be only used in claim()
    function random_value(bytes32 seed) internal view returns (uint){
        return uint(keccak256(abi.encodePacked(claimed_number, msg.sender, seed, now)));
    }

   
    // It takes the unhashed password and a hashed random seed generated from the user
    function claim(string memory password, bytes32 seed) public returns (uint){
        // Unsuccessful
        require (claimed_number < total_number, "Out of Stock.");
        for (uint i = 0; i < claimers.length; i++){
            require (msg.sender != claimers[i].addr, "Already Claimed.");
        }
        uint claimed_value;
        if (keccak256(bytes(password)) != hashes[claimed_number]){
            emit Failure(keccak256(bytes(password)), hashes[claimed_number]);      //for debug use
        }
        require (keccak256(bytes(password)) == hashes[claimed_number]);
        claimed_value = random_value(seed) % remaining_value + 1;  //[1,remaining_value]
        msg.sender.transfer(claimed_value);
        claimed_number ++;
        claimers.push(Claimer({index: claimed_number, addr: msg.sender, claimed_value: claimed_value, claimed_time: now}));
        emit ClaimSuccess(msg.sender, claimed_value);
        return claimed_value;
    }
    
    // Returns 1. remaining value 2. remaining number of red packets
    function check_availability() public view returns (uint, uint){
        return (remaining_value, total_number - claimed_number);
    }

    function check_claimed_list() public view returns (Claimer[] memory){
        return claimers;
    }

    function () external payable {
    }
}
