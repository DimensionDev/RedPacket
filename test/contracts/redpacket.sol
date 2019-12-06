pragma solidity >0.4.22;

contract HappyRedPacket{

    struct RedPacket{
        uint id;
        bool ifrandom;
        uint[] values;
        address creator;
        uint total_number;
        uint claimed_number;
        uint remaining_value;
        uint expiration_time;
        string claimed_list_str;
        address[] claimer_addrs;
        bytes32[] hashes;
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

    uint constant min_amount = 135000 * 15 * 10**9;  //0.002025 ETH
    mapping(uint => RedPacket) redpackets;
    address contract_creator;
    uint nonce;

    constructor() public {
        contract_creator = msg.sender;
    }

    // Inits a red packet instance
    function create (bytes32[] memory _hashes, bool _ifrandom, uint duration, bytes32 seed) public payable {

        nonce += 1;
        uint _id = uint(keccak256(abi.encodePacked(msg.sender, now, nonce)));

        RedPacket storage rp = redpackets[_id];
        rp.id = _id;

        rp.total_number = _hashes.length;
        require(msg.value >= min_amount * rp.total_number, "You need to insert at least 0.001 ETH to your red packet.");
        require(_hashes.length > 0, "At least 1 person can claim the red packet.");

        if (duration == 0) {
            duration = 86400;//24hours
        }
        
        rp.creator = msg.sender;
        rp.expiration_time = now + duration;
        rp.claimed_number = 0;
        rp.ifrandom = _ifrandom;
        rp.hashes = _hashes;

        uint total_value = msg.value;
        uint rand_value;
        for (uint i = 0; i < rp.total_number; i++){
            if (rp.ifrandom)
                rand_value = min_amount + random_value(seed, i) % (total_value - (rp.total_number - i) * min_amount); //make sure everyone can at least get min_amount
            else
                rand_value = total_value / rp.total_number;
            rp.values.push(rand_value);
            total_value -= rand_value;
        }


        emit CreationSuccess(rp.id, rp.creator, rp.remaining_value);
    }

    // An interactive way of generating randint
    // This should be only used in claim()
    // Pending on finding better ways
    function random_value(bytes32 seed, uint nonce_rand) internal view returns (uint rand){
        return uint(keccak256(abi.encodePacked(nonce_rand, msg.sender, seed, now)));
    }

   
    // It takes the unhashed password and a hashed random seed generated from the user
    function claim(uint id, string memory password) public returns (uint claimed){
        RedPacket storage rp = redpackets[id];

        // Unsuccessful
        require (rp.expiration_time > now, "Expired.");
        require (rp.claimed_number < rp.total_number, "Out of Stock.");
        require (rp.claimers[msg.sender].claimed_value == 0, "Already Claimed");
        require (keccak256(bytes(password)) == rp.hashes[rp.claimed_number], "Wrong Password.");

        // Store claimer info
        rp.claimer_addrs.push(msg.sender);
        //Claimer memory claimer = claimers[msg.sender];
        uint claimed_value = rp.values[rp.claimed_number];
        rp.claimers[msg.sender].index = rp.claimed_number;
        rp.claimers[msg.sender].claimed_value = claimed_value;
        rp.claimers[msg.sender].claimed_time = now;
        rp.claimed_number ++;
        
        // Transfer the red packet after state changing
        msg.sender.transfer(claimed_value);

        // Claim success event
        emit ClaimSuccess(rp.id, msg.sender, claimed_value);
        return claimed_value;
    }
    
    // Returns 1. remaining value 2. total number of red packets 3. claimed number of red packets`
    function check_availability() public view returns (uint id, uint balance, uint total, uint claimed){
        RedPacket storage rp = redpackets[id];
        return (rp.id, rp.remaining_value, rp.total_number, rp.claimed_number);
    }

    function check_claimed_list() public view returns (uint id, uint[] memory claimed_list){
        RedPacket storage rp = redpackets[id];
        uint[] memory claimed_values = new uint[](rp.claimed_number);
        for (uint i = 0; i < rp.claimed_number; i++){
            claimed_values[i] = rp.claimers[rp.claimer_addrs[i]].claimed_value;
        }
        return (rp.id, claimed_values);
    }

    function refund(uint id) public {
        RedPacket storage rp = redpackets[id];
        require(msg.sender == rp.creator, "Only the red packet creator can refund the money");
        require(rp.expiration_time < now, "Disallowed until the expiration time has passed");
        
        emit RefundSuccess(rp.id, rp.remaining_value);
        msg.sender.transfer(rp.remaining_value);
    }
    
    // One cannot send tokens to this contract after constructor anymore
    //function () external payable {
    //}
}
