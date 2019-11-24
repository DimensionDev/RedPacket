pragma solidity >0.4.22;

contract RedPacket{

    struct RedPacket{
        uint id;
        bool ifrandom;
        address creator;
        uint total_number;
        uint claimed_number;
        uint remaining_value;
        uint expiration_time;
        string claimed_list_str;
        address[] claimer_addrs;
        bytes32[] public hashes;
        mapping(address => Claimer) claimers;
    }

    struct Claimer{
        uint index;
        uint claimed_value;
        uint claimed_time;
    }

    event CreationSuccess(
        uint id,
        address creator,
        uint total
    );
    
    event ClaimSuccess(
        uint id,
        address claimer,
        uint claimed_value
    );

    event Failure(
        uint id,
        bytes32 hash1,
        bytes32 hash2
    );
    event RefundSuccess(
        uint id,
        uint remaining_balance
    );

    //1 ETH = 1000000000000000000(10^18) WEI
    uint constant min_amount = 135000 * 15 * 10**9;  //0.002025 ETH
    //uint constant max_amount = 1 * 10**18;

    bool ifrandom;
    address creator;
    uint total_number;
    uint claimed_number; // nonce
    uint expiration_time;
    uint[] private values;
    string claimed_list_str;
    bytes32[] public hashes;
    //Claimer[] public claimers;
    address[] claimer_addrs;
    mapping(address => Claimer) claimers;

    // Inits a red packet instance
    constructor (bytes32[] memory _hashes, bool _ifrandom, uint duration, bytes32 seed) public payable {
        total_number = _hashes.length;
        require(msg.value >= min_amount * total_number, "You need to insert at least 0.001 ETH to your red packet.");
        require(_hashes.length > 0, "At least 1 person can claim the red packet.");
        if (duration == 0){
            duration = 86400;   // default set to (60/15) * 60 * 60 = 5760 blocks, which is approximately 24 hours, assuming block time is 15s
        }
        
        uint memory id = keccak256(abi.encodePacked(msg.sender, now, rpindex));
        creator = msg.sender;
        expiration_time = now + duration;
        claimed_number = 0;
        ifrandom = _ifrandom;
        hashes = _hashes;

        uint total_value = address(this).balance;
        uint rand_value;
        for (uint i = 0; i < total_number; i++){
            if (ifrandom)
                rand_value = min_amount + random_value(seed, i) % (total_value - (total_number - i) * min_amount); //make sure everyone can at least get min_amount
            else
                rand_value = total_value / total_number;
            values.push(rand_value);
            total_value -= rand_value;
        }


        emit CreationSuccess(creator, address(this).balance);
    }

    // An interactive way of generating randint
    // This should be only used in claim()
    // Pending on finding better ways
    function random_value(bytes32 seed, uint nonce) internal view returns (uint rand){
        return uint(keccak256(abi.encodePacked(nonce, msg.sender, seed, now)));
    }

   
    // It takes the unhashed password and a hashed random seed generated from the user
    function claim(string memory password) public returns (uint claimed){
        // Unsuccessful
        require (expiration_time > now, "Expired.");
        require (claimed_number < total_number, "Out of Stock.");
        require (claimers[msg.sender].claimed_value == 0, "Already Claimed");
        require (keccak256(bytes(password)) == hashes[claimed_number], "Wrong Password.");

        // Store claimer info
        claimer_addrs.push(msg.sender);
        //Claimer memory claimer = claimers[msg.sender];
        uint claimed_value = values[claimed_number];
        claimers[msg.sender].index = claimed_number;
        claimers[msg.sender].claimed_value = claimed_value;
        claimers[msg.sender].claimed_time = now;
        claimed_number ++;
        
        // Transfer the red packet after state changing
        msg.sender.transfer(claimed_value);

        // Claim success event
        emit ClaimSuccess(msg.sender, claimed_value);
        return claimed_value;
    }
    
    // Returns 1. remaining value 2. total number of red packets 3. claimed number of red packets`
    function check_availability() public view returns (uint balance, uint total, uint claimed){
        return (address(this).balance, total_number, claimed_number);
    }

    function check_claimed_list() public view returns (uint[] memory claimed_list){
        uint[] memory claimed_values = new uint[](claimed_number);
        for (uint i = 0; i < claimed_number; i++){
            claimed_values[i] = claimers[claimer_addrs[i]].claimed_value;
        }
        return claimed_values;
    }

    function refund() public {
        require(msg.sender == creator, "Only the red packet creator can refund the money");
        require(expiration_time < now, "Disallowed until the expiration time has passed");
        
        emit RefundSuccess(address(this).balance);
        msg.sender.transfer(address(this).balance);
    }
    
    // One cannot send tokens to this contract after constructor anymore
    //function () external payable {
    //}
}
