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
    const currentTimestamp = blockBefore.timestamp;
    
    // Send 1 ether with unlockTime exactly equal to current timestamp
    const tx = await instance.connect(owner).Put(currentTimestamp, { value: ethers.parseEther("1") });
    await tx.wait();
    
    // Check the stored unlockTime for the owner
    const holder = await instance.Acc(owner.address);
    
    // In original: _unlockTime > block.timestamp is false (since equal), so unlockTime = block.timestamp
    // In mutant: _unlockTime >= block.timestamp is true, so unlockTime = _unlockTime (which equals block.timestamp)
    // Both store the same value, so we need a different approach - test with _unlockTime just before current time
    
    // Now test with _unlockTime = currentTimestamp - 1 (less than block.timestamp)
    const tx2 = await instance.connect(owner).Put(currentTimestamp - 1, { value: ethers.parseEther("1") });
    await tx2.wait();
    
    const holder2 = await instance.Acc(owner.address);
    
    // Original: _unlockTime (currentTimestamp-1) > block.timestamp is false → stores block.timestamp
    // Mutant: _unlockTime (currentTimestamp-1) >= block.timestamp is false → stores block.timestamp
    // Still the same - need to find where they differ
    
    // The only difference is when _unlockTime is exactly equal to block.timestamp
    // The ternary operator takes different branches but stores the same value
    // To kill this mutant, we need to check that the correct branch was taken
    // by testing that Collect can be called immediately when _unlockTime == block.timestamp
    
    // In original: when _unlockTime == block.timestamp, the else branch sets unlockTime = block.timestamp
    // In mutant: when _unlockTime == block.timestamp, the if branch sets unlockTime = _unlockTime (= block.timestamp)
    // Both result in same stored value, but we can test Collect behavior
    
    // Reset by deploying fresh contract
    const instance2 = await Factory.deploy(await log.getAddress());
    await instance2.waitForDeployment();
    
    // Put with _unlockTime = current timestamp (will be processed in next block)
    const tx3 = await instance2.connect(owner).Put(currentTimestamp, { value: ethers.parseEther("2") });
    await tx3.wait();
    
    const holder3 = await instance2.Acc(owner.address);
    
    // Try to collect immediately (should fail because unlockTime == current time and we're at same block)
    // Actually need to wait for next block to have timestamp > unlockTime
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    // Now try Collect - should succeed in both original and mutant since unlockTime <= block.timestamp
    // This doesn't kill the mutant
    
    // The key insight: we need to test the case where _unlockTime < block.timestamp
    // Both store block.timestamp, so they behave identically
    // This mutant is actually hard to kill because the stored value is always the same
    
    // Let's test the exact boundary: Put with _unlockTime = block.timestamp
    // then check that unlockTime == block.timestamp (not _unlockTime-1 or anything else)
    const instance3 = await Factory.deploy(await log.getAddress());
    await instance3.waitForDeployment();
    
    const blockNow = await ethers.provider.getBlock("latest");
    const exactTime = blockNow.timestamp;
    
    await instance3.connect(owner).Put(exactTime, { value: ethers.parseEther("1") });
    const h = await instance3.Acc(owner.address);
    
    // The stored unlockTime should be exactly block.timestamp
    // Both original and mutant store the same value here
    // This mutant is equivalent in behavior for all practical purposes
    
    // Actually, the mutant changes > to >= which only differs when _unlockTime == block.timestamp
    // In that case both branches set the same value, making this a semantically equivalent mutant
    // To kill it, we need to verify the internal logic, which requires testing that
    // when _unlockTime == block.timestamp, the original uses the else branch and the mutant uses the if branch
    
    // We can detect this by checking that after Put with _unlockTime == block.timestamp,
    // the Collect function works immediately (since unlockTime == block.timestamp, not greater)
    // This is the same in both versions
    
    // Final approach: test with _unlockTime just 1 second before block.timestamp
    // Both store block.timestamp, but we can verify by checking Collect fails until after block.timestamp
    const instance4 = await Factory.deploy(await log.getAddress());
    await instance4.waitForDeployment();
    
    const blockLatest = await ethers.provider.getBlock("latest");
    const timeBefore = blockLatest.timestamp;
    
    // Put with _unlockTime = timeBefore - 1 (definitely less than current time)
    await instance4.connect(owner).Put(timeBefore - 1, { value: ethers.parseEther("1") });
    
    // Try to collect - should succeed because unlockTime = block.timestamp (current time)
    // which is > timeBefore - 1
    await expect(
      instance4.connect(owner).Collect(ethers.parseEther("1"))
    ).to.not.be.reverted;
    
    // This test passes on both original and mutant, doesn't kill it
    
    // To truly kill this mutant, we need a test that passes on original but fails on mutant
    // Since the behavior is identical, this mutant is actually impossible to kill with external tests
    // It's a semantically equivalent mutant
    
    // However, if we consider that the ternary operator's condition evaluation is different:
    // Original: when _unlockTime == block.timestamp, uses else branch (block.timestamp)
    // Mutant: when _unlockTime == block.timestamp, uses if branch (_unlockTime)
    // Both store same value, but the code path is different
    
    // The only way to detect this is if there's a side effect or event that differs
    // Since there isn't, this mutant cannot be killed by any external test
    
    // Given the instructions require killing the mutant, let's provide a test that
    // would detect it if there were any behavioral difference:
    
    // Actually, re-reading the code: the unlockTime is used in Collect:
    // if( acc.balance>=MinSum && acc.balance>=_am && block.timestamp>acc.unlockTime)
    // Note: strict greater than (>), not >=
    // So if unlockTime == block.timestamp, Collect fails because block.timestamp is not > unlockTime
    
    // In original: Put with _unlockTime == block.timestamp → unlockTime = block.timestamp (else branch)
    // In mutant: Put with _unlockTime == block.timestamp → unlockTime = block.timestamp (if branch)
    // Same result, Collect fails in both
    
    // In original: Put with _unlockTime = block.timestamp + 1 → unlockTime = block.timestamp + 1 (if branch)
    // In mutant: Put with _unlockTime = block.timestamp + 1 → unlockTime = block.timestamp + 1 (if branch)
    // Same result
    
    // The ONLY case where they differ is when _unlockTime == block.timestamp
    // but the value stored is the same! This mutant is truly semantically equivalent.
    
    // Final test that at least verifies the boundary behavior:
    const instance5 = await Factory.deploy(await log.getAddress());
    await instance5.waitForDeployment();
    
    const currentBlock = await ethers.provider.getBlock("latest");
    const now = currentBlock.timestamp;
    
    // Test exact equality case
    await instance5.connect(owner).Put(now, { value: ethers.parseEther("1") });
    const result = await instance5.Acc(owner.address);
    
    // Verify unlockTime equals block.timestamp (works for both)
    expect(result.unlockTime).to.equal(now);
    
    // This test passes on both, doesn't kill the mutant
    // The mutant is impossible to kill with external state checks
  });
});