import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m98c71966 detection", function () {
  it("should detect isOperationReady returning incorrect true with OR instead of AND", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with minimum delay of 1 hour (3600 seconds)
    const minDelay = 3600;
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Schedule an operation with the minimum delay
    const target = ethers.ZeroAddress;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;
    
    await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Compute the operation ID
    const id = await timelock.hashOperation(target, value, data, predecessor, salt);
    
    // Verify operation is pending but not ready (timestamp > _DONE_TIMESTAMP but not yet <= block.timestamp)
    const isPending = await timelock.isOperationPending(id);
    expect(isPending).to.be.true;
    
    // This is the critical assertion: before the delay passes, isOperationReady should return false
    // The mutant with OR would return true because timestamp > _DONE_TIMESTAMP is satisfied
    const isReady = await timelock.isOperationReady(id);
    expect(isReady).to.be.false;
  });
});