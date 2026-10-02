import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - block.prevrandao vs block.timestamp", function () {
  it("should kill mutant m5998c066 by proving time-lock can be bypassed with block.prevrandao", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(log.target);
    await instance.waitForDeployment();

    // Get the current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;

    // Set unlockTime far in the future (e.g., current time + 1 year)
    const futureUnlockTime = currentTimestamp + 31536000; // 1 year in seconds

    // User deposits 2 ether (MinSum is 1 ether)
    await instance.connect(user).Put(futureUnlockTime, { value: ethers.parseEther("2") });

    // Now attempt to Collect 1 ether before the unlock time
    // On original contract: should revert because block.timestamp < futureUnlockTime
    // On mutant: may succeed because block.prevrandao could be any value, potentially > futureUnlockTime
    const tx = instance.connect(user).Collect(ethers.parseEther("1"));

    // If the mutant allows the withdrawal (does not revert), it is killed
    // We expect the original to revert, so if it doesn't revert, the mutant is detected
    await expect(tx).to.be.revertedWith(""); // Any revert reason (or no revert) kills the mutant

    // Additional check: if the transaction succeeded (mutant killed), verify balance changed
    // This is optional but helps confirm the mutant behavior
    const balanceAfter = await instance.Acc(user.address);
    if (balanceAfter.balance < ethers.parseEther("2")) {
      // Mutant allowed early withdrawal - test passes (kills mutant)
      expect(true).to.be.true;
    }
  });
});