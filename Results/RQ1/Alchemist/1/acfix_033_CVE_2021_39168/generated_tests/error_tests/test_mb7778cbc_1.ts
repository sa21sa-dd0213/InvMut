import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - getTimestamp", function () {
  it("should detect mutant that removes return statement from getTimestamp", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Schedule an operation
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.randomBytes(32);
    const delay = minDelay;
    
    // Calculate operation ID
    const operationId = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Get timestamp before scheduling - should be 0
    const timestampBefore = await instance.getTimestamp(operationId);
    expect(timestampBefore).to.equal(0);
    
    // Schedule the operation
    const scheduleTx = await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    await scheduleTx.wait();
    
    // Get timestamp after scheduling - should be > 0 in the original
    const timestampAfter = await instance.getTimestamp(operationId);
    
    // In the original contract, this should return block.timestamp + delay (a value > 0)
    // In the mutant, getTimestamp returns 0 (default), so this assertion will fail on the mutant
    expect(timestampAfter).to.be.gt(0);
  });
});