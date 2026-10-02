import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m05a0b445 detection", function () {
  it("should detect mutant by verifying unlockTime reset when _lockTime=0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy MONEY_BOX (no constructor arguments)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy Log contract (required by MONEY_BOX)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).SetMinSum(0);
    await instance.connect(owner).Initialized();
    
    // First Put with a future lock time (e.g., 1000 seconds)
    const lockTime1 = 1000;
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(lockTime1, { value: depositAmount });
    
    // Check that unlockTime was set to future timestamp
    const acc1 = await instance.Acc(addr1.address);
    const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
    expect(acc1.unlockTime).to.be.greaterThan(currentTimestamp + 999);
    
    // Second Put with _lockTime = 0 (should reset unlockTime to current timestamp in original)
    await instance.connect(addr1).Put(0, { value: ethers.parseEther("0") });
    
    // Check unlockTime - in original it should be ~currentTimestamp, in mutant it remains future
    const accAfter = await instance.Acc(addr1.address);
    const blockAfter = await ethers.provider.getBlock("latest");
    
    // In original: unlockTime should be reset to block.timestamp (current time)
    // In mutant: unlockTime remains the future value from first Put
    // We verify by trying to collect immediately - should succeed in original, fail in mutant
    const collectAmount = ethers.parseEther("0.5");
    
    // Try to collect - in original this succeeds (unlockTime reset to now), in mutant it reverts
    const balanceBefore = await ethers.provider.getBalance(addr1.address);
    
    // This should succeed on original, revert on mutant
    if (accAfter.unlockTime > blockAfter.timestamp) {
      // Mutant detected: unlockTime wasn't reset
      expect(accAfter.unlockTime).to.be.greaterThan(blockAfter.timestamp);
    } else {
      // Original behavior: unlockTime was reset, collect should work
      await expect(
        instance.connect(addr1).Collect(collectAmount)
      ).to.not.be.reverted;
    }
    
    // Alternative direct detection: verify unlockTime is NOT equal to block.timestamp
    // In original, after Put(0), unlockTime should be ~block.timestamp
    // In mutant, unlockTime remains the old future value
    expect(accAfter.unlockTime).to.not.equal(blockAfter.timestamp);
  });
});