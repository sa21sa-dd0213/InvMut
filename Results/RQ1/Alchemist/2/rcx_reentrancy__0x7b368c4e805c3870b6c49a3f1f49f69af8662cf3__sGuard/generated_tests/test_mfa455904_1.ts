import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant mfa455904 test", function () {
  it("should kill mutant by calling Collect before unlock time and expecting revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(logInstance.target);
    await instance.waitForDeployment();

    const futureUnlockTime = Math.floor(Date.now() / 1000) + 86400; // 1 day in future
    const depositAmount = ethers.parseEther("2");

    // First, Put funds with a future unlock time
    await instance.connect(addr1).Put(futureUnlockTime, { value: depositAmount });

    // Try to Collect immediately (before unlock time)
    // Original: should revert because block.timestamp < unlockTime
    // Mutant: would succeed incorrectly because block.timestamp < unlockTime
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});