import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - mbd961505", function () {
  it("should revert when trying to Collect immediately after Put with past unlockTime", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Set MinSum to 1 ether (default) - deposit at least 1 ether
    const depositAmount = ethers.parseEther("1");
    const pastUnlockTime = 0; // A timestamp in the past

    // User deposits with a past unlockTime - this calls fallback which calls Put(0)
    // Put(0) will set unlockTime to block.timestamp (since 0 is not > block.timestamp)
    await expect(
      user.sendTransaction({
        to: await bank.getAddress(),
        value: depositAmount
      })
    ).to.not.be.reverted;

    // Get current block timestamp after the deposit
    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    const currentTime = blockAfter.timestamp;

    // Now try to Collect immediately - should revert because unlockTime was set to block.timestamp
    // and current time is not > unlockTime (it's equal)
    await expect(
      bank.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});