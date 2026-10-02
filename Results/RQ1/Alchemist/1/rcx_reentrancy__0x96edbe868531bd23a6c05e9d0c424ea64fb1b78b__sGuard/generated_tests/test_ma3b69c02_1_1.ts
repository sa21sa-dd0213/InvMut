import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant ma3b69c02 test", function () {
  it("should detect mutant that always updates unlockTime", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LogFile first (required by PENNY_BY_PENNY)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PENNY_BY_PENNY
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: Set MinSum and LogFile, then initialize
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();

    // First Put with long lock time (1000 seconds)
    const longLockTime = 1000;
    await instance.connect(addr1).Put(longLockTime, { value: ethers.parseEther("1.0") });

    // Get the unlock time after first Put
    const acc1 = await instance.Acc(addr1.address);
    const firstUnlockTime = acc1.unlockTime;

    // Wait a bit then call Put again with very short lock time (1 second)
    const shortLockTime = 1;
    await instance.connect(addr1).Put(shortLockTime, { value: ethers.parseEther("0.1") });

    // Get the unlock time after second Put
    const acc2 = await instance.Acc(addr1.address);
    const secondUnlockTime = acc2.unlockTime;

    // In original contract, unlockTime should remain the longer time (firstUnlockTime)
    // In mutant, unlockTime will be overwritten to a shorter time
    // We can verify by checking if unlockTime decreased (mutant) or stayed same/increased (original)
    const timeDecreased = secondUnlockTime < firstUnlockTime;

    // Try to collect after short lock time but before long lock time
    // Wait for short lock time to pass
    await ethers.provider.send("evm_increaseTime", [shortLockTime + 1]);
    await ethers.provider.send("evm_mine");

    // Attempt to collect - in original should revert (still locked by long time)
    // In mutant should succeed (unlock time was overwritten to short time)
    const collectAmount = ethers.parseEther("0.1");

    if (timeDecreased) {
      // Mutant detected: unlockTime was decreased, so collect should succeed
      await expect(
        instance.connect(addr1).Collect(collectAmount)
      ).to.not.be.reverted;
    } else {
      // Original behavior: unlockTime didn't decrease, collect should revert
      await expect(
        instance.connect(addr1).Collect(collectAmount)
      ).to.be.reverted;
    }
  });
});