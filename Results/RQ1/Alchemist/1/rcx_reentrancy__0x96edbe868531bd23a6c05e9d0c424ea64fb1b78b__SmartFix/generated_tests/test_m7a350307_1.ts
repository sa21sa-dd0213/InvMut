import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m7a350307 test", function () {
  it("should detect mutant by verifying unlockTime is not updated when _lockTime is 0 and current unlockTime is in the future", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (needed as constructor argument)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY with LogFile address
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy(await logFile.getAddress());
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.connect(owner).Initialized();
    
    // Set MinSum to 0 for testing purposes
    await instance.connect(owner).SetMinSum(0);
    
    // First, make a Put with a non-zero lock time to set an unlockTime in the future
    const lockTime1 = 1000; // seconds
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(lockTime1, { value: depositAmount });
    
    // Get the current unlockTime after first deposit
    const holder1 = await instance.Acc(addr1.address);
    const initialUnlockTime = holder1.unlockTime;
    
    // Now call Put with _lockTime = 0
    // In the original: block.timestamp + 0 = block.timestamp, which is NOT > initialUnlockTime (since initialUnlockTime > block.timestamp)
    // In the mutant: block.timestamp * 0 = 0, which IS NOT > initialUnlockTime (0 is not > a positive number)
    // Wait - we need a case where the original would NOT update but mutant WOULD
    // Let's instead use a very small _lockTime like 1 second
    // Wait for some time to pass so block.timestamp advances
    await ethers.provider.send("evm_increaseTime", [500]);
    await ethers.provider.send("evm_mine", []);
    
    // Now call Put with _lockTime = 1
    // Original: block.timestamp + 1 > initialUnlockTime? 
    // If we waited 500 seconds and initialUnlockTime was block.timestamp + 1000, then now block.timestamp = initialUnlockTime - 500, so block.timestamp + 1 < initialUnlockTime
    // Mutant: block.timestamp * 1 = block.timestamp, which is > initialUnlockTime? No, block.timestamp < initialUnlockTime
    // Need different approach
    
    // Let's reset: deploy fresh contract
    const instance2 = await Factory.deploy(await logFile.getAddress());
    await instance2.waitForDeployment();
    await instance2.connect(owner).Initialized();
    await instance2.connect(owner).SetMinSum(0);
    
    // Make a Put with lockTime = 100 seconds
    await instance2.connect(addr1).Put(100, { value: ethers.parseEther("1") });
    const holderBefore = await instance2.Acc(addr1.address);
    const unlockTimeBefore = holderBefore.unlockTime;
    
    // Advance time so that current timestamp is well past the unlockTime
    await ethers.provider.send("evm_increaseTime", [200]);
    await ethers.provider.send("evm_mine", []);
    
    // Now current timestamp > unlockTimeBefore
    // Call Put with _lockTime = 0
    await instance2.connect(addr1).Put(0, { value: ethers.parseEther("0.5") });
    
    // Get updated unlockTime
    const holderAfter = await instance2.Acc(addr1.address);
    const unlockTimeAfter = holderAfter.unlockTime;
    
    // In original: block.timestamp + 0 = block.timestamp, which IS > unlockTimeBefore (since we advanced past it)
    // So original WOULD update - this doesn't differentiate
    
    // Let's try a different scenario: set unlockTime to a very large value first
    const instance3 = await Factory.deploy(await logFile.getAddress());
    await instance3.waitForDeployment();
    await instance3.connect(owner).Initialized();
    await instance3.connect(owner).SetMinSum(0);
    
    // Make a Put with huge lockTime to set unlockTime far in future
    await instance3.connect(addr1).Put(1000000, { value: ethers.parseEther("1") });
    const holderBefore2 = await instance3.Acc(addr1.address);
    const futureUnlockTime = holderBefore2.unlockTime;
    
    // Now call Put with _lockTime = 1
    // Original: block.timestamp + 1 < futureUnlockTime (since futureUnlockTime is block.timestamp + 1000000)
    // Mutant: block.timestamp * 1 = block.timestamp, which is < futureUnlockTime
    // Both false - need case where original false but mutant true
    
    // Scenario: _lockTime = 2, current timestamp is large
    // Original: block.timestamp + 2 > futureUnlockTime? No
    // Mutant: block.timestamp * 2 > futureUnlockTime? block.timestamp * 2 = 2*block.timestamp > block.timestamp + 1000000? Only if block.timestamp > 1000000 which is true (current timestamp ~1.7B)
    // Yes! This will work
    
    await instance3.connect(addr1).Put(2, { value: ethers.parseEther("0.5") });
    const holderAfter2 = await instance3.Acc(addr1.address);
    const unlockTimeAfter2 = holderAfter2.unlockTime;
    
    // In original: unlockTime should remain unchanged (futureUnlockTime)
    // In mutant: unlockTime would be updated to block.timestamp + 2 (because the if condition becomes true)
    // We expect unlockTime to NOT change (original behavior)
    expect(unlockTimeAfter2).to.equal(futureUnlockTime);
  });
});