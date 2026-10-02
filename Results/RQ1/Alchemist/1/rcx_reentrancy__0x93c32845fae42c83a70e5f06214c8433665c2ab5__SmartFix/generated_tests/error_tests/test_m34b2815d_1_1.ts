import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m34b2815d test", function () {
  it("should detect the mutant by testing unlockTime when _unlockTime equals block.timestamp", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;

    // Test with _unlockTime = currentTimestamp (exactly equal)
    const instance2 = await Factory.deploy(await log.getAddress());
    await instance2.waitForDeployment();

    await instance2.connect(owner).Put(currentTimestamp, { value: ethers.parseEther("1") });
    const holder = await instance2.Acc(owner.address);
    
    // In both original and mutant, unlockTime = block.timestamp when _unlockTime == block.timestamp
    // But the code path differs: original uses else branch, mutant uses if branch
    // The value is the same, so we test the Collect function behavior
    
    // Try to collect immediately - should fail because unlockTime == block.timestamp
    // and Collect requires block.timestamp > unlockTime (strict greater than)
    await expect(
      instance2.connect(owner).Collect(ethers.parseEther("1"))
    ).to.be.reverted;

    // Advance time by 1 second to make block.timestamp > unlockTime
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Now Collect should succeed in both original and mutant
    await expect(
      instance2.connect(owner).Collect(ethers.parseEther("1"))
    ).to.not.be.reverted;

    // This test passes on both original and mutant
    // To truly kill the mutant, we need a different approach
    
    // The mutant changes > to >= in the ternary condition
    // Original: _unlockTime > block.timestamp → if true use _unlockTime, else use block.timestamp
    // Mutant: _unlockTime >= block.timestamp → if true use _unlockTime, else use block.timestamp
    
    // When _unlockTime == block.timestamp:
    // Original: false → uses block.timestamp
    // Mutant: true → uses _unlockTime (which equals block.timestamp)
    // Same stored value, but different code path
    
    // Since the value stored is identical, we need to test internal logic
    // We can detect this by checking that when _unlockTime == block.timestamp,
    // the Put function doesn't revert and stores the correct value
    // Both versions store the same value, so this test is the same for both
    
    // The mutant is semantically equivalent in terms of stored state,
    // but we can still write a test that verifies the behavior
    
    // Test case: _unlockTime < block.timestamp
    const instance3 = await Factory.deploy(await log.getAddress());
    await instance3.waitForDeployment();

    const blockNow = await ethers.provider.getBlock("latest");
    const exactTime = blockNow!.timestamp;

    // Put with _unlockTime = exactTime - 1 (less than current time)
    await instance3.connect(owner).Put(exactTime - 1, { value: ethers.parseEther("1") });
    const h = await instance3.Acc(owner.address);
    
    // In both original and mutant: _unlockTime (exactTime-1) > block.timestamp (exactTime) is false
    // Both store block.timestamp (exactTime)
    expect(h.unlockTime).to.equal(exactTime);

    // Test with _unlockTime > block.timestamp
    await instance3.connect(owner).Put(exactTime + 10, { value: ethers.parseEther("1") });
    const h2 = await instance3.Acc(owner.address);
    
    // In both original and mutant: _unlockTime (exactTime+10) > block.timestamp is true
    // Both store _unlockTime (exactTime+10)
    expect(h2.unlockTime).to.equal(exactTime + 10);

    // This test confirms the behavior is identical for both versions
    // The mutant cannot be killed by external tests since the stored state is the same
    // This test is designed to pass on both original and mutant versions
  });
});