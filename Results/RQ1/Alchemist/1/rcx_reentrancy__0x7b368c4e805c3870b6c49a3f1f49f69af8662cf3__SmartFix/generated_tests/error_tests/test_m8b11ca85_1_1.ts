import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m8b11ca85 detection", function () {
  it("should revert on Collect when _unlockTime < block.timestamp in Put (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Set MinSum to 0 for testing (optional, but makes test cleaner)
    // Note: MinSum is 1 ether by default, so we need to deposit at least that
    const depositAmount = ethers.parseEther("1");
    const pastTime = Math.floor(Date.now() / 1000) - 1000; // past timestamp

    // Step 1: Call Put with a past unlock time (less than current block.timestamp)
    // In original: should set unlockTime = block.timestamp (current time)
    // In mutant: would set unlockTime = pastTime (the smaller value)
    await instance.connect(addr1).Put(pastTime, { value: depositAmount });

    // Step 2: Try to collect immediately
    // Original: should revert because unlockTime is now (current timestamp),
    // and block.timestamp > unlockTime is false (they're equal)
    // Mutant: would succeed because unlockTime is in the past
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});