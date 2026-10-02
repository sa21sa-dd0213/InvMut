import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant kill test - m1b358bc4", function () {
  it("should revert when external call fails in Collect function", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy a malicious contract that rejects Ether
    const RejectorFactory = await ethers.getContractFactory("Rejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Deploy BANK_SAFE (no constructor arguments)
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const bank = await Factory.deploy();
    await bank.waitForDeployment();
    
    // Setup: Initialize and set MinSum to 0
    await bank.SetMinSum(0);
    await bank.Initialized();
    
    // Deposit funds to the rejector contract address
    const depositAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await bank.getAddress(),
      value: depositAmount
    });
    
    // Verify balance was recorded
    const balanceBefore = await bank.balances(rejector.target);
    expect(balanceBefore).to.equal(depositAmount);
    
    // Attempt Collect from the rejector contract - this should revert because the rejector rejects Ether
    // In the original contract, the else {revert()} would catch the failed call
    // In the mutant, the revert is missing so the function would succeed but the balance would be incorrectly updated
    await expect(
      bank.connect(attacker).Collect(depositAmount)
    ).to.be.reverted;
    
    // If the mutant survives (no revert), the balance would have been incorrectly deducted
    // Verify balance remains unchanged if revert occurred
    const balanceAfter = await bank.balances(rejector.target);
    expect(balanceAfter).to.equal(depositAmount);
  });
});

// Helper contract that rejects all incoming Ether
contract Rejector {
  receive() external payable {
    revert("Ether rejected");
  }
}