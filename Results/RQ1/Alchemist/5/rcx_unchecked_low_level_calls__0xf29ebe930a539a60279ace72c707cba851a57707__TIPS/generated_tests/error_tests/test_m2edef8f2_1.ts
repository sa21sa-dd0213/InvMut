import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m2edef8f2 test", function () {
  it("should revert when external call to target fails, but mutant does not revert", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract B (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ETH to test the transfer later
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // The target address in the contract is 0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C
    // We'll make a call that fails by sending 0 value (or any value that causes failure)
    // In the original, if the call fails, it reverts the entire transaction
    // In the mutant, the false condition means it never reverts
    
    // Attempt to call go() which should fail because the target call will revert
    await expect(
      instance.connect(attacker).go({ value: ethers.parseEther("0.5") })
    ).to.be.reverted; // Original would revert, mutant should NOT revert
    
    // If the mutant doesn't revert, the balance transfer to owner would succeed
    // So we check that the owner's balance increased (mutant behavior)
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    
    // Actually execute the transaction (expecting it to NOT revert for mutant)
    try {
      const tx = await instance.connect(attacker).go({ value: ethers.parseEther("0.5") });
      await tx.wait();
      
      // If we reach here, the mutant is detected because it didn't revert
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    } catch (error) {
      // If it reverts, it's the original behavior (test fails for mutant detection)
      expect.fail("Mutant was not killed - transaction reverted as in original");
    }
  });
});