# RedPacket Smart Contract 
## Workflow in RedPacket_erc721
```flow
st=>start: Start
inputTokenId=>inputoutput: Input Token IDs
checkOwnership=>operation: Check Ownership of All Input Token
op1=>operation: Create Red Packet
cond=>condition: Right Params?
revert1=>operation: Revert with Error
revert2=>operation: Revert with Error
condApprove=>condition: Approved token?
claimP=>operation: Claim Period
claim=>operation: Claim
condTransefer=>condition: Token NOT Transferred to Others?
condSatisfy=>condition: If Satisfy Claim Condition?
condAvailable=>condition: Any Available Token Remain?
condAvailable2=>condition: Any Available Token Remain?
selectToken=>operation: Random Pick Token
findAvailable=>operation: Find First Available Token in Order
claimAvailable=>operation: Claim First Available Token
claimSuccess=>operation: Transfer Claimed Token to User
claimSuccess2=>operation: Transfer Claimed Token to User
inputTokenId->checkOwnership->op1->cond
cond(yes)->condApprove
cond(no)->revert1
condApprove(yes)->claim
condApprove(no)->revert1
claim->condSatisfy
condSatisfy(yes)->condAvailable
condSatisfy(no)->revert2
condAvailable(yes)->selectToken
condAvailable(no)->revert2
selectToken->condTransefer
condTransefer(no)->findAvailable
condTransefer(yes)->claimSuccess
findAvailable->condAvailable2
condAvailable2(yes)->claimAvailable
condAvailable2(no)->revert2
claimAvailable->claimSuccess2
```

## Function Briefing in RedPacket_erc721
### General Description
Generally, users can specify a list of ERC721 token ID to create an ERC721 redpacket with RedPacket_ERC721. Then, users are able to randomly claim one NFT from the red packet.

### create_red_packet
Specify a list of token ID and create a red packet with expiration time.

```solidity
	function create_red_packet(
		address _public_key,
		uint64 _duration,
		bytes32 _seed,
		string memory _message,
		string memory _name,
		address _token_addr,
		uint256[] memory _erc721_token_ids
	) 
		external
	{}
```

- Parameters:
	- `_public_key`: Generated in Front-end. Used for verification in claim period. 
	- `_duration`: Red packet valid duration. (Unit: s) Used to calculate red packet expire time.
	- `_seed`: Used to generate packet_id.
	- `_message`: Additional message in this red packet.
	- `_name`: Name of this red packet.
	- `_token_addr`: NFT contract address
	- `_erc721_token_ids`: A list of token IDs to be packed in this red packet.

- Requirements:
  - At least one ID in `_erc721_token_ids`
  - At most 256 token IDs in `_erc721_token_ids`:
    - Since we used a uint256 to maintain the availability status of all input tokens
  - Users need to `setApprovalForAll()` in advance

- Returns:
  - N/A

- Events:

  ```solidity
  	event CreationSuccess(
  		uint256 total_tokens,
  		bytes32 indexed id,
  		string name,
  		string message,
  		address indexed creator,
  		uint256 creation_time,
  		address token_address,
  		uint256 packet_number,
  		uint256 duration,
  		uin256[] token_ids
  	);
  ```

### claim
Users can claim an ERC721 from the red packet

  ```solidity
  	function claim(
  		bytes32 pkt_id,
  		bytes memory signedMsg,
  		address payable recipient
  	)
  		external
  		returns(
  			uint256 claimed
  		)
  ```

  - Parameters:
    - `pkt_id`: Use id to specify the target red packet.
    - `signedMsg`: Result of signing the `msg.sender` with a private key (corresponding to the public key passed in `create_red_packet`)
    - `recipient`: NFT recipient.
  
  - Requirements:
    - This red packet is not expired.
    - There is still available NFT remained.
    - The user hasn't claimed before.
    - The `signedMsg` verification passed .

  - Returns:
    - `claimed`: Claimed NFT ID
  
  - Events:

	```solidity
  	event ClaimSuccess(
  		bytes32 indexed id,
  		address indexed claimer,
  		uint256 claimed_token_id,
  		address token_address
  	);
  ```
### check_ownership
Used to check whether all input tokens belong to `msg.sender`.

  ```solidity
  	function check_ownership(
  		uint256[] memory erc721_token_ids_list,
  		address token_addr
  	)
  		external
  		view
  		returns(bool is_your_token)
  	{}
  ```
  - Parameters:
      - `erc721_token_ids_list`: Token IDs to be packed in red packet.
      - `token_addr`: NFT contract address
  
  - Requirements:
      - N/A
  
  - Returns:
      - `is_your_token`: If all input tokens belong to you
  
  - Events:
      - N/A

### check_availability
Check red packet info.

  ```solidity
  	function check_availability(
  		bytes32 pkt_id
  	)
  		external
  		view
  		returns(
  			address token_address,
  			uint16 balance,
  			uint256 total_pkts,
  			bool expired,
  			uint256 claimed_id,
  			uint256 bit_status
  		)
  	{}
  ```
  - Parameters:
      - `pkt_id`: Use id to specify the target red packet.
  
  - Requirements:
     - N/A
  
  - Returns:
     - `token_address`: NFT contract address.
     - `balance`: Amount of remained token.
     - `total_pkts`: Total number of packets.
     - `expired`: If this red packet is expired.
     - `claimed_id`: Claimed token ID of the `msg.sender`.
     - `bit_status`: A uint256 records the current token availability status of this red packet.
  
  - Events:
     - N/A

### check_claimed_id
Get the claimed token ID for `msg.sender`.

```solidity
  	function check_claimed_id(
  		bytes32 id
  	)
  		external
  		view
  		returns(
  			uint256 claimed_token_id
  		)
  	{}
```
  - Parameters:
      - `id`: Use id to specify the target red packet.
  
  - Requirements:
     - N/A
  
  - Returns:
     - `claimed_token_id`: Claimed token ID of this `msg.sender`.
  
  - Events:
     - N/A

### check_erc721_remain_ids
Get the current availability status of all tokens in a red packet.

```solidity
	function check_erc721_remain_ids(
		bytes32 id
	)
		external 
		view
		returns(
			uint256 bit_status,
			uint256[] memory erc721_token_ids
		)
	{}
```

- Parameters:
  - `id`: Use id to specify the target red packet.

- Requirements:
  - N/A

- Returns:
  - `bit_status`: A uint256 records the current token availability status of this red packet.
  - `erc721_token_ids`: Token IDs packed in this red packet when `create_red_packet`.

- Events:
  - N/A

