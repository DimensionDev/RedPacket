const TestToken = artifacts.require("TestToken");
const Test721Token = artifacts.require("Test721Token");
const HappyRedPacket = artifacts.require("HappyRedPacket");
var testtoken;
var test721token;
var redpacket;
var redpacket_id;
var _total_tokens

contract("TestToken", accounts => {
    beforeEach(async () =>{
        console.log("Before ALL\n");
        testtoken = await TestToken.deployed();
        redpacket = await HappyRedPacket.deployed();
        _total_tokens = 101;
    });

    it("Should return the HappyRedPacket contract creator", async () => {
        const contract_creator = await redpacket.contract_creator.call();
        assert.equal(contract_creator, accounts[0]);
    });

    it("Should return a redpacket id", async () => {

        const passwords = ["1", "2"];
        const hashes = passwords.map(function (pass) {
            return web3.utils.sha3(pass);
        });
        const name = "cache";
        const msg = "hi";
        const number = 3;
        const duration = 1200;
        const seed = web3.utils.sha3("lajsdklfjaskldfhaikl");
        const token_type = 1;
        const token_address = testtoken.address;
        const total_tokens = _total_tokens;

        const creation_success_encode = 'CreationSuccess(uint256,bytes32,address,uint256,address,uint256[])';
        const creation_success_types = ['uint256', 'bytes32', 'address', 'uint256', 'address', 'uint256[]'];

        await testtoken.approve.sendTransaction(redpacket.address, total_tokens);
        const creation_receipt = await redpacket.create_red_packet
                                .sendTransaction(hashes[0], number, true, duration, seed, msg,
                                                    name, token_type, token_address, total_tokens);
        const logs = await web3.eth.getPastLogs({address: redpacket.address, topics: [web3.utils.sha3(creation_success_encode)]});
        redpacket_id = web3.eth.abi.decodeParameters(creation_success_types, logs[0].data)['1'];
        assert.notEqual(redpacket_id, null);
    });

    it("Should allow two users to claim red packets.", async () => {
        const redpacket = await HappyRedPacket.deployed();
        const password = "1";
        const rp_id = redpacket_id;

        const claim_success_encode = "ClaimSuccess(%s,%s,%s,%s)";
        const claim_success_types = ['bytes32', 'address', 'uint256', 'address'];

        // Check Availability
        var returned = await redpacket.check_availability.call(rp_id);
        assert.equal(returned.ifclaimed, false);

        // 1st
        const recipient1 = accounts[1];
        const validation1 = web3.utils.sha3(recipient1);

        const claim_receipt = await redpacket.claim.sendTransaction(rp_id, password, recipient1, validation1, {'from': recipient1});
        const logs = await web3.eth.getPastLogs({address: redpacket.address, topic: [web3.utils.sha3(claim_success_encode)]});
        console.log(web3.eth.abi.decodeParameters(claim_success_types, logs[0].data));

        // Check Availability
        returned = await redpacket.check_availability.call(rp_id, {'from': recipient1});
        assert.equal(returned.ifclaimed, true);

        // 2nd
        const recipient2 = accounts[2];
        const validation2 = web3.utils.sha3(recipient2);

        const claim_receipt2 = await redpacket.claim.sendTransaction(rp_id, password, recipient2, validation2, {'from':recipient2});
        const logs2 = await web3.eth.getPastLogs({address: redpacket.address, topic: [web3.utils.sha3(claim_success_encode)]});
        console.log(web3.eth.abi.decodeParameters(claim_success_types, logs2[0].data));

        // Check Availability
        returned = await redpacket.check_availability.call(rp_id, {'from': recipient2});
        assert.equal(returned.ifclaimed, true);

        // 3rd
        const recipient3 = accounts[3];
        const validation3 = web3.utils.sha3(recipient3);

        const claim_receipt3 = await redpacket.claim.sendTransaction(rp_id, password, recipient3, validation3, {'from':recipient3});
        const logs3 = await web3.eth.getPastLogs({address: redpacket.address, topic: [web3.utils.sha3(claim_success_encode)]});
        console.log(web3.eth.abi.decodeParameters(claim_success_types, logs3[0].data));

        // Check Availability
        returned = await redpacket.check_availability.call(rp_id, {'from': recipient3});
        assert.equal(returned.ifclaimed, true);

        // Check balance
        const balance1 = await testtoken.balanceOf.call(recipient1, {'from':recipient1});
        const balance2 = await testtoken.balanceOf.call(recipient2, {'from':recipient2});
        const balance3 = await testtoken.balanceOf.call(recipient3, {'from':recipient3});
        const balance4 = await testtoken.balanceOf.call(accounts[4], {'from':accounts[4]});

        // Assert
        assert.isAbove(Number(balance1), 0);
        assert.isAbove(Number(balance2), 0);
        assert.isAbove(Number(balance3), 0);
        assert.equal(Number(balance4), 0);
        assert.equal(Number(balance1) + Number(balance2) + Number(balance3), _total_tokens)

    });

});
contract("Test721Token", accounts => {
    beforeEach(async () =>{
        console.log("Before ALL\n");
        test721token = await Test721Token.deployed();
        redpacket = await HappyRedPacket.deployed();
        _total_tokens = 10;
    });
    it("Should return the HappyRedPacket contract creator", async () => {
        const contract_creator = await redpacket.contract_creator.call();
        assert.equal(contract_creator, accounts[0]);
    });
    it("Should return a redpacket id", async () => {

        const passwords = ["1", "2"];
        const hashes = passwords.map(function (pass) {
            return web3.utils.sha3(pass);
        });
        const name = "cache";
        const msg = "hi";
        const number = 3;
        const duration = 1200;
        const seed = web3.utils.sha3("lajsdklfjaskldfhaikl");
        const token_type = 2;
        const token_address = test721token.address;
        // const token_total = await test721token.balanceOf.call(accounts[0]);
        const token_total = 5;
        const token_ids = [];
        for (i=0; i < token_total; i++) {
            token_id = await test721token.tokenOfOwnerByIndex.call(accounts[0], i);
            token_ids.push(token_id);
        }
        const total_tokens = token_ids.length;

        // console.log('---------')
        // console.log('1234----')
        // console.log(token_ids);
        // console.log('---------')

        const creation_success_encode = 'CreationSuccess(uint256,bytes32,address,uint256,address,uint256[])';
        const creation_success_types = ['uint256', 'bytes32', 'address', 'uint256', 'address', 'uint256[]'];

        await test721token.setApprovalForAll.sendTransaction(redpacket.address, true);
        const creation_receipt = await redpacket.create_red_packet
                                .sendTransaction(hashes[0], number, true, duration, seed, msg,
                                                    name, token_type, token_address, total_tokens, token_ids);
        // console.log(creation_receipt);
        const logs = await web3.eth.getPastLogs({address: redpacket.address, topics: [web3.utils.sha3(creation_success_encode)]});
        log = web3.eth.abi.decodeParameters(creation_success_types, logs[0].data);
        redpacket_id = log['1']
        redpacket_token_ids = log['5'];
        assert.notEqual(redpacket_id, null);
        assert.notEqual(token_ids, null);
        assert.equal(await test721token.balanceOf(redpacket.address), 5)
    });
    it("Should allow two users to claim red packets.", async () => {
        // const redpacket = await HappyRedPacket.deployed();
        const password = "1";
        const rp_id = redpacket_id;

        const claim_success_encode = "ClaimSuccess(%s,%s,%s,%s,%s)";
        const claim_success_types = ['bytes32', 'address', 'uint256', 'address', 'uint256'];

        // Check Availability
        var returned = await redpacket.check_availability.call(rp_id);
        assert.equal(returned.ifclaimed, false);

        // 1st
        const recipient1 = accounts[1];
        const validation1 = web3.utils.sha3(recipient1);

        const claim_receipt = await redpacket.claim.sendTransaction(rp_id, password, recipient1, validation1, {'from': recipient1});
        const logs = await web3.eth.getPastLogs({address: redpacket.address, topic: [web3.utils.sha3(claim_success_encode)]});
        console.log(await redpacket.check_erc721_token_ids.call(rp_id));


        // Check Availability
        returned = await redpacket.check_availability.call(rp_id, {'from': recipient1});
        assert.equal(returned.ifclaimed, true);

        // 2nd
        const recipient2 = accounts[2];
        const validation2 = web3.utils.sha3(recipient2);

        const claim_receipt2 = await redpacket.claim.sendTransaction(rp_id, password, recipient2, validation2, {'from':recipient2});
        const logs2 = await web3.eth.getPastLogs({address: redpacket.address, topic: [web3.utils.sha3(claim_success_encode)]});
        console.log(await redpacket.check_erc721_token_ids.call(rp_id));

        // Check Availability
        returned = await redpacket.check_availability.call(rp_id, {'from': recipient2});
        assert.equal(returned.ifclaimed, true);

        // 3rd
        const recipient3 = accounts[3];
        const validation3 = web3.utils.sha3(recipient3);

        const claim_receipt3 = await redpacket.claim.sendTransaction(rp_id, password, recipient3, validation3, {'from':recipient3});
        const logs3 = await web3.eth.getPastLogs({address: redpacket.address, topic: [web3.utils.sha3(claim_success_encode)]});
        console.log(await redpacket.check_erc721_token_ids.call(rp_id));
        // Check Availability
        returned = await redpacket.check_availability.call(rp_id, {'from': recipient3});
        assert.equal(returned.ifclaimed, true);

        // Check balance
        const balance1 = await test721token.balanceOf.call(recipient1, {'from':recipient1});
        const balance2 = await test721token.balanceOf.call(recipient2, {'from':recipient2});
        const balance3 = await test721token.balanceOf.call(recipient3, {'from':recipient3});
        const balance4 = await test721token.balanceOf.call(accounts[4], {'from':accounts[4]});

        // Assert
        assert.isAbove(Number(balance1), 0);
        assert.isAbove(Number(balance2), 0);
        assert.isAbove(Number(balance3), 0);
        assert.equal(Number(balance4), 0);
        // assert.equal(Number(balance1) + Number(balance2) + Number(balance3), _total_tokens)

    });
});