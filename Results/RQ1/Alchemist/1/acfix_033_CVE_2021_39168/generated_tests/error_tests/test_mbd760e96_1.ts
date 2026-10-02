import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mbd760e96 - isOperationPending", function () {
  it("should detect mutant by verifying isOperationPending returns true for a scheduled operation", async function () {
    const [owner, proposer] = await ethers.getSigners();
    
    // Deploy with minDelay of 1 second, one proposer, and open executor role
    const minDelay = 1;
    const proposers = [proposer.address];
    const executors: string[] = []; // Empty to keep EXECUTOR_ROLE open to anyone
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer if not already set (constructor already did this)
    // Schedule a simple operation (target can be any address, e.g., owner)
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay; // Use minimum delay
    
    // Connect as proposer and schedule
    const proposerInstance = instance.connect(proposer);
    const tx = await proposerInstance.schedule(target, value, data, predecessor, salt, delay);
    await tx.wait();
    
    // Compute the operation ID to check status
    const operationId = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Immediately after scheduling, the operation should be pending (timestamp > _DONE_TIMESTAMP)
    // but not yet ready (since delay hasn't passed)
    const isPending = await instance.isOperationPending(operationId);
    
    // The original returns true; the mutant (with removed return) would return false
    expect(isPending).to.be.true;
  });
});