pragma solidity >0.4.22;

contract RedPacket{

    struct Claimer{
        uint amount;
        uint index;
        address addr;
    }

    address creator;
    uint total_number;
    uint claimed_number;
    uint remaining;
    bool random;
    bytes32[] public hashes;
    Claimer[] public claimers;

    // Inits a red packet instance
    constructor (uint[] _hashes, bool ifrandom) public {
        require(msg.sender = creator);
        require(msg.value > 0)
        require(_hashes.length > 0)

        creator = msg.sender;
        claimed_number = 0;
        total_number = _hashes.length;
        remaining = amount;
        random = ifrandom;
        for (uint i = 0; i < total_number; i++){
            hashes.push(_hahes[i]);
        }
    }

    // Skeleton
    // Here I am planning to adopt an interactive way of generating randint
    // This should be only used in claim()
    function random_amount(bytes32 seed) private returns uint{
        return 0;
    }
   
    // It takes the unhashed password and a hashed random seed generated from the user
    function claim(string password, bytes32 seed) returns uint{
        // Unsuccessful
        if (claimed_number > total_number-1){
            return 0;
        }
        for (uint i = 0; i < claimers.length; i++){
            // Bad bad
            if (msg.sender == claimers[i].addr){
                return 0;
            }
        }
        if (keccak256(password) == hashes[claimed_number]){
            uint claimed_amount = random_amount(seed);
            msg.sender.transfer(claimed_amount);
            claimed_number ++;
            claimers.push(Claimer(amount = claimed_amount, index = claimed_number, addr = msg.sender))
        }
    }
}
