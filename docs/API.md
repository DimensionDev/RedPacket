# RedPacket Smart Contract 
## Content Overview
- [Function Briefing in RedPacket_erc721](#function-briefing-in-redpacket_erc721)
  - [General Description](#general-description)
  - [Workflow in RedPacket_erc721](#workflow-in-redpacket_erc721)
  - [create_red_packet](#create_red_packet)
  - [claim](#claim)
  - [check_ownership](#check_ownership)
  - [check_availability](#check_availability)
  - [check_claimed_id](#check_claimed_id)
  - [check_erc721_remain_ids](#check_erc721_remain_ids)
- [Function Briefing in Fungible Token Red Packet](#function-briefing-in-fungible-token-red-packet)
  - [General Description for Red Packet](#general-description-for-red-packet)
  - [Workflow in Red Packet](#workflow-in-red-packet)
  - [create_red_packet](#create-red-packet)
  - [claim](#claim-packet)
  - [check_availability](#check-red-packet-availability)
  - [refund](#refund)
- [Verification Design](#verification-design)

## Function Briefing in RedPacket_erc721
### General Description
Generally, users can specify a list of ERC721 token ID to create an ERC721 red packet with RedPacket_ERC721. Then, users are able to randomly claim one NFT from the red packet.

### Workflow in RedPacket_erc721
![Workflow](Workflow.png)

1. Users need to call `setApprovalForAll()` in advance to approve of our red packet operating users' asset.

2. Users call `create_red_packet()` in our red packet contract. At this step, users need to specify a list of the NFT tokenID to be put in red packet. During creation, the specified NFTs are **NOT** transferred to our red packet since it requires plenty of gas if we transfer these NFTs one by one. At this stage, red packet contract only has the grant to operate the NFTs rather than **own** these NFTs. Thus, we need to design a mechanism to handle the situation where an NFT has already been transferred to another address when a user tries to claim it.

3. Users can call `claim()` function to claim an NFT from the red packet. 
    - At the beginning, the NFT will be picked randomly. 
    - If the picked NFT is still in red packet creators's account, then the user can claim the NFT directly.
    - If the user meets the situation where an NFT has already been transferred to another address, then red packet contract needs to reselect an available NFT:
        - We use a `uint256` variable `bit_status` to record the status of each NFT in red packet. (Therefore, we currently only allow 256 NFTs to be put in red packet at most.)
        - Firstly, we start to scan `bit_status` from the first bit. If the bit is 1, we skip it; If the bit is 0, we check if the NFT still belongs to the red packet creator.
        - If yes, we pick this NFT and stop the NFT selection period.
        - If no, we update the corresponding bit in `bit_status` to 1 and continue to scan `bit_status`. 
        - Then we repeat the above steps until we find an available NFT or there is no NFT remain(Will be revert with error).


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
	- `_public_key`: Generated at Front-end. Used for verification in claim period. Check detail at [Verification Design](#verification-design)
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
Users can claim an ERC721 token from the red packet.

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
  {}
```

- Parameters:
  - `pkt_id`: Use id to specify the target red packet.
  - `signedMsg`: Result of signing the `msg.sender` with a private key (corresponding to the public key passed in `create_red_packet`). Check detail at [Verification Design](#verification-design)
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
    returns(
      bool is_your_token
    )
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

## Function Briefing in Fungible Token Red Packet
### General Description for Red Packet
Generally, users can specify a list of ERC721 token ID to create an ERC721 red packet with RedPacket_ERC721. Then, users are able to randomly claim one NFT from the red packet.

### Workflow in Red Packet
1. Users need to call `approve()` to approve of our red packet contract operating enough amount of users' tokens.

2. Users call `create_red_packet()` in our red packet contract. At this step, creators are able to choose the claim method: average or random. **Notice**: Different from the design in RedPacket_ERC721, tokens to be put in red packet will be transferred to red packet contract during red packet creation period.

3. Users can call `claim()` to claim tokens from the red packet.
    1. If the claimer is claiming the last packet, the claimer will get all of the remaining tokens directly.
    2. Otherwise, if the red packet is set as random, the claimer will get random amount of tokens. If the red packet is set as average, the claimer will get average amount of tokens.

4. After the red packet expired, if there are remaining tokens in this red packet, the red packet creator is able to withdraw the remaining tokens.


### create red packet 
Specify a list of token ID and create a red packet with expiration time.

```solidity
  function create_red_packet(
    address _public_key,
    uint _number,
    bool _ifrandom,
    uint _duration,
    bytes32 _seed,
    string memory _message,
    string memory _name,
    uint _token_type,
    address _token_addr,
    uint _total_tokens
  )
    public
    payable
  {}
```

- Parameters:
  - `_public_key`: Generated at Front-end. Used for verification in claim period. Check detail at [Verification Design](#verification-design)
  - `_number`: The amount of packets in red packet.
  - `_ifrandom`: The claim method for this red packet. If true, claimer will claim random number of token. Otherwise, claimer will claim average number of token.
  - `_duration`: The valid period time for this red packet. This can determine the expire time of a red packet.
  - `_seed`: Used to generate packet_id.
  - `_message`: Additional message in this red packet.
  - `_name`: Name of this red packet.
  - `_token_type`: 0 - ETH  1 - ERC20
  - `_token_addr`: token contract address.
  - `_total_tokens`; Amount of token to put in red packet.

- Requirements:
  - Total token amount should be greater than packets amount.
  - Packets number should be in the range: 1-255 (including 1 and 255).
  - Token type should be 0 or 1.
  - If user creates an ETH red packet, `msg.value` should be greater than the stated token amount. If user creates an ERC20 red packet, user should approve at least the stated amount of token to our red packet contract.

- Returns:
  - N/A

- Events:

  ```solidity
    event CreationSuccess(
      uint total,
      bytes32 id,
      string name,
      string message,
      address creator,
      uint creation_time,
      address token_address,
      uint number,
      bool ifrandom,
      uint duration
    );
  ```

### claim packet
Users can claim random(or average) amount of token from the red packet.

```solidity
  function claim(
    bytes32 id,
    bytes memory signedMsg,
    address payable recipient
  )
    public
    returns(
      uint claimed
    )
  {}
```

- Parameters:
  - `pkt_id`: Use id to specify the target red packet.
  - `signedMsg`: Result of signing the `msg.sender` with a private key (corresponding to the public key passed in `create_red_packet`). Check detail at [Verification Design](#verification-design)
  - `recipient`: Token recipient.

- Requirements:
  - This red packet is not expired.
  - There is still available packet remained.
  - The user hasn't claimed before.
  - The `signedMsg` verification passed .

- Returns:
  - `claimed`: Claimed NFT ID

- Events:

  ```solidity
    event ClaimSuccess(
      bytes32 id,
      address claimer,
      uint claimed_value,
      address token_address
    );
  ```

### check red packet availability
Check red packet info.

```solidity
  function check_availability(bytes32 id) external view returns(
    address token_address,
    uint balance,
    uint total,
    uint claimed,
    bool expired,
    uint256 claimed_amount
  )
  {}
```

- Parameters:
  - `id`: Use id to specify the target red packet.
  
- Requirements:
  - N/A
  
- Returns:
  - `token_address`: Token contract address.
  - `balance`: Amount of remained token.
  - `total`: Total number of packets.
  - `claimed`: Claimed number of red packets.
  - `expired`: If this red packet is expired.
  - `claimed_amount`: The claimed amount of `msg.sender`
  
- Events:
  - N/A

### refund
After the red packet expired, the red packet creator is able to withdraw the remaining token.

```solidity
  function refund(bytes32 id) public {}
```
- Parameters:
  - `id`: Use id to specify the target red packet.
  
- Requirements:
  - The `msg.sender` should be red packet creator.
  - The red packet is expired.
  - There is token remained in the red packet.
  
- Returns:
  - N/A

- Events:

  ```solidity
    event RefundSuccess(
      bytes32 id,
      address token_address,
      uint remaining_balance
    );
  ```

## Verification Design
Both red packet smart contracts contain a verification mechanism which is used to ensure the claimer is claiming red packet through our Mask extension.

Verification mechanism:
1. Front-end randomly generates an Ethereum account A (the account address is the public key) with its private key. While creating the red packet, we need to pass the public key to red packet smart contract as a parameter.
2. Smart contract will store the public key and front-end will keep the private key.
3. When a user tries to claim the red packet, front-end will sign a message with the private key of account A. The content of this message is the address of account B who calls the `claim()` function (i.e. `msg.sender`).
4. The signature will be passed to smart contract as a parameter while calling `claim()`. 
5. With the signature and the hash of `msg.sender`, red packet smart contract is able to calculate the address of account who signs the message.
6. By comparing the public key stored during red packet creation period with the account address we calculated, we are able to distinguish if the function caller carries the signature signed with the right private key kept in front-end.

With this mechanism:
- Users who don't have the private key, they cannot generate a right signature. So they will be rejected while calling `claim()`.
- If they listen to Ethereum network, and catch the transaction payload which claimed successfully. They will try to claim with the same payload. They'll still get rejected since our contract will calculate the hash of message using `msg.sender` which cannot be the same with the successful claim case.
