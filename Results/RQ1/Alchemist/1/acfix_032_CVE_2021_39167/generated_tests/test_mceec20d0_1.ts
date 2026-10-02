import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - isOperationReady", function () {
  it("should fail on mutant when executing operation after more than one block delay", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with 1 second minimum delay
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      1, // minDelay
      [proposer.address], // proposers
      [executor.address] // executors
    );
    await instance.waitForDeployment();
    
    // Schedule a simple operation (sending 0 ETH to executor)
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = 1; // 1 second delay
    
    // Proposer schedules the operation
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Get operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Wait until operation is ready (after the delay)
    await ethers.provider.send("evm_increaseTime", [2]); // Increase by 2 seconds to ensure we're past the exact timestamp
    await ethers.provider.send("evm_mine", []);
    
    // Now the operation's timestamp should be in the past (block.timestamp > operation timestamp)
    // The original returns true (ready), the mutant returns false (not ready)
    
    // Attempt to execute - should succeed on original, fail on mutant
    await expect(
      instance.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 })
    ).to.be.reverted;
  });
});