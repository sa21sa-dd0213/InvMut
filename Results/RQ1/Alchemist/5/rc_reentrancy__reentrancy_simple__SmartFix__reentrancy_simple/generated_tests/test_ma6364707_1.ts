import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - ma6364707", function () {
    it("should revert when withdrawBalance() is called and the external call fails", async function () {
        const [owner, attacker] = await ethers.getSigners();
        
        // Deploy the Reentrance contract
        const Factory = await ethers.getContractFactory("Reentrance");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Deploy a malicious contract that will revert on receive
        const MaliciousFactory = await ethers.getContractFactory("MaliciousReenter");
        const malicious = await MaliciousFactory.deploy(await instance.getAddress());
        await malicious.waitForDeployment();
        
        // Fund the malicious contract with some ETH via the Reentrance contract
        const fundAmount = ethers.parseEther("1.0");
        await owner.sendTransaction({
            to: await malicious.getAddress(),
            value: fundAmount
        });
        
        // Malicious contract adds balance to itself in Reentrance
        await malicious.connect(attacker).addToBalance({ value: fundAmount });
        
        // Verify balance was added
        expect(await instance.getBalance(await malicious.getAddress())).to.equal(fundAmount);
        
        // Now call withdrawBalance - the malicious contract's receive will revert
        // In the original contract, this should revert due to the !_s check
        // In the mutant with false, it will not revert and will lose the balance
        await expect(
            malicious.connect(attacker).attack()
        ).to.be.reverted;
        
        // If the mutant killed the check, the balance would be 0 despite the revert
        // In the original, the balance should remain intact because the transaction reverted
        expect(await instance.getBalance(await malicious.getAddress())).to.equal(fundAmount);
    });
});

// Helper contract to deploy
contract MaliciousReenter {
    Reentrance public target;
    
    constructor(address _target) {
        target = Reentrance(_target);
    }
    
    function addToBalance() external payable {
        target.addToBalance{value: msg.value}();
    }
    
    function attack() external {
        target.withdrawBalance();
    }
    
    receive() external payable {
        revert("I refuse to accept ETH");
    }
}