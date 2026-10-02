import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - onlyRealPeople modifier removal", function () {
  it("should revert when a contract calls wager() on original, but pass on mutant without the require check", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy PoCGame with constructor arguments
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(attacker.address, betLimit);
    await instance.waitForDeployment();
    
    // Open the contract to the public
    await instance.connect(owner).OpenToThePublic();
    
    // Deploy a malicious contract that will call wager() on PoCGame
    const MaliciousFactory = await ethers.getContractFactory("MaliciousCaller");
    const malicious = await MaliciousFactory.deploy(await instance.getAddress());
    await malicious.waitForDeployment();
    
    // Fund the malicious contract with ETH to make the wager
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: betLimit
    });
    
    // Attempt to call wager() through the malicious contract
    // On original contract: should revert because msg.sender != tx.origin
    // On mutant: should succeed because the require check is removed
    await expect(malicious.callWager()).to.be.reverted;
  });
});

// Helper contract to simulate a contract calling wager() on PoCGame
contract MaliciousCaller {
    address public target;
    
    constructor(address _target) {
        target = _target;
    }
    
    function callWager() external payable {
        (bool success, ) = target.call{value: msg.value}(abi.encodeWithSignature("wager()"));
        require(success, "Call failed");
    }
    
    receive() external payable {}
}