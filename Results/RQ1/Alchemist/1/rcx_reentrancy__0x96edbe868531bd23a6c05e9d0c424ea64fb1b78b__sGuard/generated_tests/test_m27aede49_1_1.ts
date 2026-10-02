import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant detection - m27aede49", function () {
  it("should detect reversed unlock time comparison in Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set minimum sum to 0 to allow Collect
    await instance.connect(owner).SetMinSum(0);
    await instance.connect(owner).Initialized();
    
    const depositAmount = ethers.parseEther("1.0");
    const shortLockTime = 100; // 100 seconds
    const longLockTime = 1000; // 1000 seconds
    
    // First Put with long lock time
    await instance.connect(addr1).Put(longLockTime, { value: depositAmount });
    
    // Get the unlock time after first deposit
    const holderInfoAfterFirst = await instance.Acc(addr1.address);
    const unlockTimeAfterFirst = holderInfoAfterFirst.unlockTime;
    
    // Second Put with shorter lock time
    await instance.connect(addr1).Put(shortLockTime, { value: depositAmount });
    
    // Get the unlock time after second deposit
    const holderInfoAfterSecond = await instance.Acc(addr1.address);
    const unlockTimeAfterSecond = holderInfoAfterSecond.unlockTime;
    
    // In the original contract, unlock time should remain the longer one
    // In the mutant, it would be updated to the shorter one
    // Fast forward to just after the short lock time would expire (but before long lock time)
    const timeToAdvance = shortLockTime + 10;
    await ethers.provider.send("evm_increaseTime", [timeToAdvance]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to collect - should revert for original (still locked), might succeed for mutant
    const collectAmount = ethers.parseEther("1.0");
    
    // Check if the unlock time was incorrectly reduced (mutant behavior)
    // If unlock time was reduced, Collect would succeed when it should fail
    if (unlockTimeAfterSecond < unlockTimeAfterFirst) {
      // This is the mutant behavior - test that it fails
      await expect(
        instance.connect(addr1).Collect(collectAmount)
      ).to.be.reverted;
    } else {
      // Original behavior - unlock time preserved
      await expect(
        instance.connect(addr1).Collect(collectAmount)
      ).to.be.reverted;
    }
  });
});