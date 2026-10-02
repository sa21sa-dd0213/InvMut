import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test for isOperationDone", function () {
  it("should detect the mutant by checking that a pending operation is not marked as done", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to the owner for testing purposes
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    await instance.connect(owner).grantRole(PROPOSER_ROLE, owner.address);
    
    // Schedule an operation with a delay
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = minDelay + 100; // slightly more than minimum
    
    await instance.connect(owner).schedule(target, value, data, predecessor, salt, delay);
    
    // Compute the operation ID
    const operationId = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // At this point, the operation is pending (timestamp > 0 and > _DONE_TIMESTAMP)
    // but NOT done (timestamp should not equal _DONE_TIMESTAMP = 1)
    // The mutant with >= would incorrectly return true for any timestamp >= 1
    
    const isDone = await instance.isOperationDone(operationId);
    
    // The original would return false because timestamp >> 1
    // The mutant would return true because timestamp >= 1
    expect(isDone).to.equal(false);
  });
});