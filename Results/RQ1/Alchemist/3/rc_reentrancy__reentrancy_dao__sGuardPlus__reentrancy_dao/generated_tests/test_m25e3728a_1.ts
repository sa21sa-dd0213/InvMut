import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m25e3728a", function () {
  it("should detect missing require(callResult) by reverting on failed external call", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the ReentrancyDAO contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Deploy a malicious contract that will fail on receiving ether
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Fund the malicious contract so it can deposit
    await owner.sendTransaction({
      to: malicious.target,
      value: ethers.parseEther("1.0")
    });
    
    // Deposit from the malicious contract to the DAO
    await malicious.connect(owner).depositToDAO(dao.target, { value: ethers.parseEther("0.5") });
    
    // Verify the deposit was recorded
    expect(await dao.credit(malicious.target)).to.equal(ethers.parseEther("0.5"));
    
    // Attempt withdrawal - in the original contract this would revert
    // In the mutant (without require), it should not revert but leave inconsistent state
    await malicious.connect(owner).attemptWithdraw(dao.target);
    
    // In the mutant: balance was deducted but credit wasn't reset
    // The attacker contract received nothing (due to revert), but DAO balance is wrong
    expect(await dao.balance()).to.equal(0); // Balance was incorrectly deducted
    expect(await dao.credit(malicious.target)).to.equal(ethers.parseEther("0.5")); // Credit remains unchanged
  });
});

// Helper contract to simulate failed external calls
// This would be deployed as a separate Solidity file
contract MaliciousReceiver {
    function depositToDAO(address dao) external payable {
        (bool success, ) = dao.call{value: msg.value}(
            abi.encodeWithSignature("deposit()")
        );
        require(success, "Deposit failed");
    }
    
    function attemptWithdraw(address dao) external {
        (bool success, ) = dao.call(
            abi.encodeWithSignature("withdrawAll()")
        );
        // Don't require success - just observe the state
    }
    
    // Fallback that reverts to simulate failed payment
    receive() external payable {
        revert("Payment rejected");
    }
}