import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m35bcafb6 - block.timestamp >= unlockTime", function () {
  it("should revert on original when calling Collect exactly at unlockTime, but mutant would allow it", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Set MinSum to 0 to simplify test (or use 1 ether as default)
    // Default MinSum is 1 ether, so we'll deposit at least 1 ether

    const depositAmount = ethers.parseEther("1");
    const unlockTime = Math.floor(Date.now() / 1000); // current block timestamp

    // Deposit with unlock time set to current time
    await instance.connect(addr1).Put(unlockTime, { value: depositAmount });

    // Attempt to collect exactly at the unlock time
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted; // Original reverts because block.timestamp is NOT strictly greater than unlockTime

    // If the test passes (reverts), it means the mutant is killed
    // If the test fails (doesn't revert), the mutant is live and incorrectly allows withdrawal
  });
});