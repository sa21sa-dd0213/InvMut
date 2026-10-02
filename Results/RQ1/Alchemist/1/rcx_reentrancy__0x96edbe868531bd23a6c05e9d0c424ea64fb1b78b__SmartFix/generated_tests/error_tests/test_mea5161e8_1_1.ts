import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant mea5161e8 detection", function () {
  it("should detect mutant that always updates unlockTime by testing lock time override", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contracts - PENNY_BY_PENNY has no constructor arguments
    const PennyFactory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const penny = await PennyFactory.deploy();
    await penny.waitForDeployment();

    const LogFactory = await ethers.getContractFactory("LogFile");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Setup: Set MinSum to 0 and initialize the contract
    await (await penny.SetMinSum(0)).wait();
    await (await penny.SetLogFile(await log.getAddress())).wait();
    await (await penny.Initialized()).wait();

    // First Put: Lock funds with a long lock time (e.g., 1000 seconds)
    const longLockTime = 1000;
    const depositAmount = ethers.parseEther("1.0");
    await (await penny.connect(addr1).Put(longLockTime, { value: depositAmount })).wait();

    // Get the current unlock time after first deposit
    const accAfterFirst = await penny.Acc(addr1.address);
    const firstUnlockTime = accAfterFirst.unlockTime;

    // Second Put: Try to override with a shorter lock time (e.g., 100 seconds)
    const shortLockTime = 100;
    await (await penny.connect(addr1).Put(shortLockTime, { value: depositAmount })).wait();

    // Get the unlock time after second deposit
    const accAfterSecond = await penny.Acc(addr1.address);
    const secondUnlockTime = accAfterSecond.unlockTime;

    // In the original contract, unlockTime should NOT be overwritten to a shorter time
    // In the mutant, it WILL be overwritten to the shorter time
    // We can verify by checking if unlockTime decreased
    if (secondUnlockTime < firstUnlockTime) {
      // Mutant detected - unlockTime was incorrectly overwritten to a shorter time
      // Now try to collect before the original lock time expires
      const currentBlock = await ethers.provider.getBlock("latest");
      const timeUntilOriginalLock = Number(firstUnlockTime) - Number(currentBlock!.timestamp);

      // Mine blocks to advance time just past the short lock time but before the long lock time
      await ethers.provider.send("evm_increaseTime", [timeUntilOriginalLock - 50]);
      await ethers.provider.send("evm_mine", []);

      // In the mutant, this Collect should succeed (incorrectly) because unlockTime was shortened
      // In the original, this would revert because unlockTime is still the long one
      const collectAmount = ethers.parseEther("0.5");
      await expect(
        penny.connect(addr1).Collect(collectAmount)
      ).to.be.reverted;

      // If we reach here, the Collect reverted, which means the mutant might still have the original behavior
      // But we already detected the unlockTime change above
      expect(secondUnlockTime).to.be.lessThan(firstUnlockTime);
    } else {
      // Original behavior - unlock time was NOT overwritten
      // This test should fail on the mutant because the mutant would have overwritten it
      expect(secondUnlockTime).to.be.lessThan(firstUnlockTime);
    }
  });
});