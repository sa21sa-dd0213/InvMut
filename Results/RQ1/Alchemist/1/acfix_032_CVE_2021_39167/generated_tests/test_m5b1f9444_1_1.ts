import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m5b1f9444 - duplicate schedule detection", function () {
  it("should revert when trying to schedule the same operation twice", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();

    // Grant PROPOSER_ROLE to the proposer if not already set
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();

    // Setup test operation parameters
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;

    // First schedule should succeed
    await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay);

    // Second schedule with identical parameters should revert
    await expect(
      timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay)
    ).to.be.revertedWith("TimelockController: operation already scheduled");
  });
});