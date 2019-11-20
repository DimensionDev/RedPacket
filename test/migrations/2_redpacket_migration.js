
var RedPacket = artifacts.require("RedPacket");

module.exports = function(deployer){
    deployer.deploy(RedPacket, "0x0ba95ac53d7b7a09545c36fe6de3e78f8ebcd2f2a65d31b14c5519d063e241dd", true, 1);
};
