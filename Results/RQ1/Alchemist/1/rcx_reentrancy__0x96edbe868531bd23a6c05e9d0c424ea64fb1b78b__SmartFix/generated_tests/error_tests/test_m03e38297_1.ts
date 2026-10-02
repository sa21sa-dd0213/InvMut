import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant kill test", function () {
  it("should detect mutant m03e38297 by checking unlock time update on second Put with shorter lock", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.Initialized();

    // Set MinSum to 0 so Collect can work with any balance
    await instance.SetMinSum(0);

    // Deploy a LogFile contract (required for AddMessage to work)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await instance.SetLogFile(await logInstance.getAddress());

    const depositAmount = ethers.parseEther("1");
    const longLockTime = 100000; // large lock time in seconds
    const shortLockTime = 1; // very short lock time

    // First deposit with a long lock time
    await instance.connect(addr1).Put(longLockTime, { value: depositAmount });

    // Record the unlock time after first deposit
    let accInfo = await instance.Acc(addr1.address);
    const firstUnlockTime = accInfo.unlockTime;

    // Second deposit with a short lock time - this should update unlockTime in original
    await instance.connect(addr1).Put(shortLockTime, { value: depositAmount });

    // Check the unlock time after second deposit
    accInfo = await instance.Acc(addr1.address);
    const secondUnlockTime = accInfo.unlockTime;

    // In the original contract: block.timestamp + shortLockTime > firstUnlockTime should be false
    // (since firstUnlockTime = block.timestamp1 + longLockTime, and longLockTime >> shortLockTime)
    // So original would NOT update unlockTime: secondUnlockTime == firstUnlockTime
    // In the mutant: block.timestamp - shortLockTime > firstUnlockTime would be false too
    // BUT the key difference is: if we wait until after shortLockTime but before longLockTime expires,
    // the original would still have unlockTime in the future, while mutant might have updated it incorrectly.

    // To directly kill the mutant: we need a scenario where the condition evaluation differs.
    // Let's create a case where the original updates unlockTime but mutant does NOT.
    
    // Reset by deploying fresh contract
    const instance2 = await Factory.deploy();
    await instance2.waitForDeployment();
    await instance2.Initialized();
    await instance2.SetMinSum(0);
    await instance2.SetLogFile(await logInstance.getAddress());

    // Deposit with a moderate lock time first
    const moderateLock = 500;
    await instance2.connect(addr1).Put(moderateLock, { value: depositAmount });
    
    // Now deposit with a VERY LARGE lock time (should extend unlockTime in original)
    const hugeLock = 1000000;
    await instance2.connect(addr1).Put(hugeLock, { value: depositAmount });

    // Get the unlock time
    accInfo = await instance2.Acc(addr1.address);
    const finalUnlockTime = accInfo.unlockTime;
    
    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTime = block.timestamp;

    // In original: block.timestamp + hugeLock > previous unlock time -> update happens
    // So finalUnlockTime should be approximately currentTime + hugeLock
    // In mutant: block.timestamp - hugeLock > previous unlock time -> FALSE (since subtraction makes it small)
    // So mutant would NOT update, finalUnlockTime would be currentTime + moderateLock (smaller)
    
    // The mutant would have a SMALLER unlock time than original
    // So we can kill the mutant by trying to collect after the shorter period
    // but before the longer period - mutant would allow it, original would revert
    
    // Wait for moderateLock time to pass (or simulate by advancing time)
    await ethers.provider.send("evm_increaseTime", [moderateLock + 10]);
    await ethers.provider.send("evm_mine", []);

    // Try to collect - in original this should revert because unlockTime is still in the future
    // (since original updated to hugeLock time which hasn't passed)
    // In mutant, unlockTime was NOT updated (still at moderateLock time which has passed)
    // So mutant would allow the collect
    
    await expect(
      instance2.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});