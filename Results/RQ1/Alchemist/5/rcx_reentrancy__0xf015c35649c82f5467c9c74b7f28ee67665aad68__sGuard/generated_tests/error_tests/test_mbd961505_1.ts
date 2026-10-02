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
    
    // User deposits with a past unlockTime
    await expect(
      user.sendTransaction({
        to: await bank.getAddress(),
        value: depositAmount
      })
    ).to.not.be.reverted;
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTime = blockBefore.timestamp;
    
    // Now try to Collect immediately - should revert in original (unlockTime set to block.timestamp)
    // In mutant, unlockTime would be 0 (past), so Collect would succeed - that's the bug
    await expect(
      bank.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});