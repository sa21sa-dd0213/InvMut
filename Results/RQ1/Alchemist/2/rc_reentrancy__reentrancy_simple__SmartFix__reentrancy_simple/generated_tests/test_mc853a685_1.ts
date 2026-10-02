import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - mc853a685", function () {
  it("should revert when withdrawal fails due to recipient reverting, preserving balance", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Reentrance contract
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious receiver that reverts on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Fund the Reentrance contract with some ETH
    const depositAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });
    
    // Add balance to the malicious contract's address
    const addTx = await instance.connect(malicious).addToBalance({ value: depositAmount });
    await addTx.wait();
    
    // Verify initial balance
    expect(await instance.getBalance(await malicious.getAddress())).to.equal(depositAmount);
    
    // Attempt withdrawal - should fail because malicious receiver reverts
    // The original contract reverts the whole transaction on failed call
    // The mutant would not revert, setting balance to 0 incorrectly
    await expect(
      instance.connect(malicious).withdrawBalance()
    ).to.be.reverted;
    
    // Balance should remain unchanged because the transaction reverted
    expect(await instance.getBalance(await malicious.getAddress())).to.equal(depositAmount);
  });
});

// Helper contract that reverts on ETH receive
contract MaliciousReceiver {
  receive() external payable {
    revert("I reject your payment");
  }
}