const TestToken = artifacts.require("TestToken");
const HappyRedPacket = artifacts.require("HappyRedPacket");
var testtoken;
var redpacket;
var redpacket_id;

contract("TestToken", accounts => {
    beforeEach(async () =>{
        console.log("Before ALL\n");
        testtoken = await TestToken.deployed();
        redpacket = await HappyRedPacket.deployed();
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
        const number = 2;
        const duration = 1200;
        const seed = web3.utils.sha3("lajsdklfjaskldfhaikl");
        const token_type = 1;
        const token_address = testtoken.address;
        const total_tokens = 101;

        const creation_success_encode = 'CreationSuccess(uint256,bytes32,address,uint256,address)';
        const creation_success_types = ['uint256', 'bytes32', 'address', 'uint256', 'address'];

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
        const recipient1 = accounts[0];
        const validation1 = web3.utils.sha3(accounts[0]);

        const claim_receipt = await redpacket.claim.sendTransaction(rp_id, password, recipient1, validation1);
        const logs = await web3.eth.getPastLogs({address: redpacket.address, topic: [web3.utils.sha3(claim_success_encode)]});
        console.log(web3.eth.abi.decodeParameters(claim_success_types, logs[0].data));

        // Check Availability
        returned = await redpacket.check_availability.call(rp_id);
        assert.equal(returned.ifclaimed, true);

        // 2nd
        const recipient2 = accounts[1];
        const validation2 = web3.utils.sha3(accounts[1]);

        const claim_receipt2 = await redpacket.claim.sendTransaction(rp_id, password, recipient2, validation2, {'from':recipient2});
        const logs2 = await web3.eth.getPastLogs({address: redpacket.address, topic: [web3.utils.sha3(claim_success_encode)]});
        console.log(web3.eth.abi.decodeParameters(claim_success_types, logs2[0].data));

        // Check Availability
        returned = await redpacket.check_availability.call(rp_id, {'from':accounts[1]});
        assert.equal(returned.ifclaimed, true);

        // Check balance
        const balance1 = await testtoken.balanceOf.call(accounts[0], {'from':accounts[0]});
        const balance2 = await testtoken.balanceOf.call(accounts[1], {'from':accounts[1]});
        const balance3 = await testtoken.balanceOf.call(accounts[2], {'from':accounts[2]});

        // Assert
        assert.isAbove(Number(balance1), 0);
        assert.isAbove(Number(balance2), 0);
        assert.equal(Number(balance3), 0);

    });

});
