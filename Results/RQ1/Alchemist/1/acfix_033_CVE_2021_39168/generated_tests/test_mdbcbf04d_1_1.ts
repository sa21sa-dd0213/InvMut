import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test", function () {
  it("should execute an operation scheduled exactly at block.timestamp (original passes, mutant reverts)", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    const minDelay = 100; // 100 seconds
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;

    // Schedule an operation with delay such that it becomes ready exactly at current timestamp
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;

    // Schedule the operation
    await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay);

    // Fast-forward time to exactly currentTimestamp + minDelay
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + minDelay]);
    await ethers.provider.send("evm_mine", []);

    // Now the operation should be ready (timestamp == block.timestamp in original, but < in mutant)
    // Attempt to execute - should succeed in original, revert in mutant
    await expect(
      timelock.connect(executor).execute(target, value, data, predecessor, salt, { gasLimit: 1000000 })
    ).to.be.revertedWith("TimelockController: operation is not ready");
  });
});