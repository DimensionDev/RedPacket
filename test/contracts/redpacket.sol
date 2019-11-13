pragma solidity >0.4.22;

contract RedPacket{

    struct Claimer{
        uint index;
        address addr; 
        uint claimed_amount;
    }
    
    //1 ETH = 1000000000000000000(10^18) WEI
    uint constant min_amount = 1000 * 1000;
    uint constant max_amount = 1 * 10**18;

    address creator;
    uint total_number;
    uint claimed_number; // nonce
    uint remaining;
    string claimed_list_str;
    bool random;
    bytes32[] public hashes;
    Claimer[] public claimers;

    // Inits a red packet instance
    constructor (uint[] _hashes, bool ifrandom) public {
        require(msg.sender = creator);
        require(msg.value > 0)
        require(_hashes.length > 0)

        claimed_list_str = "";
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
    function random_amount(bytes32 seed) private returns memory uint{
        return memory uint(keccak256(claimed_number, msg.sender, seed));
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
    function addr2str(address x) returns (string) {
        bytes memory b = new bytes(20);
        for (uint i = 0; i < 20; i++)
            b[i] = byte(uint8(uint(x) / (2**(8*(19 - i)))));
        return string(b);
    }
   
    // It takes the unhashed password and a hashed random seed generated from the user
    function claim(string password, bytes32 seed) public returns uint{
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
            memory uint claimed_amount = random_amount(seed) % remaining + 1;  //[1,remaining]
            msg.sender.transfer(claimed_amount);
            claimed_number ++;
            claimers.push(Claimer(amount = claimed_amount, index = claimed_number, addr = msg.sender))
            claimed_list_str += addr2str(msg.sender) + ": " + uint2str(claimed_amount) + "\n"
        }
        return 1;
    }
    
    // Returns 1. remaining number of red packets 2. claimed list
    function check_availability() public view returns (uint, string){
        return total_number - claimed_number, claimed_list;
    }
}
