import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Reentrance mutant kill test - m31bd0739", function () {
  it("should revert when withdrawBalance is called from a contract that cannot receive ETH", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy Reentrance (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple contract that rejects ETH (no receive/fallback)
    const RejectorFactory = await ethers.getContractFactory("contract Rejector { }");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Fund the Reentrance contract with ETH
    const depositAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: instance.target,
      value: depositAmount
    });
    
    // Add balance for the rejector contract address
    await instance.connect(attacker).addToBalance({ value: depositAmount });
    
    // Get balance before withdrawal
    const balanceBefore = await instance.getBalance(rejector.target);
    
    // Attempt to withdraw from the rejector contract address (will fail in original)
    await expect(
      instance.connect(attacker).withdrawBalance()
    ).to.be.reverted;
    
    // In the original contract, balance should remain unchanged
    // In the mutant, this test would fail because the transaction would succeed
    const balanceAfter = await instance.getBalance(attacker.address);
    expect(balanceAfter).to.equal(balanceBefore);
  });
});