import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test", function () {
  it("should revert when delay is less than minDelay (original behavior) but mutant incorrectly accepts it", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with a minDelay of 100 seconds
    const minDelay = 100;
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Schedule an operation with delay LESS than minDelay (e.g., 50)
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = 50; // Less than minDelay of 100
    
    // In the original contract, this should revert because delay < minDelay
    // In the mutant (delay <= minDelay), this would incorrectly pass
    await expect(
      timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay)
    ).to.be.revertedWith("TimelockController: insufficient delay");
  });
});