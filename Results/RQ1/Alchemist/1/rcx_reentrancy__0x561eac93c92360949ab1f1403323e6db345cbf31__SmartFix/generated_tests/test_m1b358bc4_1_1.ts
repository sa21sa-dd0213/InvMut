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
    
    // Deposit funds to the bank contract (using owner's address)
    const depositAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await bank.getAddress(),
      value: depositAmount
    });
    
    // Verify balance was recorded for the owner (not rejector)
    const balanceBefore = await bank.balances(owner.address);
    expect(balanceBefore).to.equal(depositAmount);
    
    // Attempt Collect from the rejector contract address - this should revert
    // because the rejector rejects Ether and the call is made from attacker's address
    // which has no balance
    await expect(
      bank.connect(attacker).Collect(depositAmount)
    ).to.be.reverted;
    
    // Verify balance remains unchanged for the owner
    const balanceAfter = await bank.balances(owner.address);
    expect(balanceAfter).to.equal(depositAmount);
  });
});

// Helper contract that rejects all incoming Ether
contract Rejector {
  receive() external payable {
    revert("Ether rejected");
  }
}