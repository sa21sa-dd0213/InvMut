import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mcdf49bb6 - isOperationReady", function () {
  it("should return false for a completed operation (timestamp = 1) and kill the mutant that uses >= instead of >", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 100; // 100 seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant TIMELOCK_ADMIN_ROLE to executor so _afterCall succeeds
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    await instance.connect(owner).grantRole(TIMELOCK_ADMIN_ROLE, executor.address);
    
    // Schedule an operation
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = minDelay;
    
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Get operation ID
    const operationId = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [delay]);
    await ethers.provider.send("evm_mine");
    
    // Execute the operation to complete it (sets timestamp to 1 = _DONE_TIMESTAMP)
    await instance.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 });
    
    // Now check isOperationReady - should return false for completed operation
    const isReady = await instance.isOperationReady(operationId);
    
    // In original: timestamp > 1 is false for timestamp = 1, so isReady = false
    // In mutant: timestamp >= 1 is true for timestamp = 1, so isReady = true
    expect(isReady).to.equal(false);
  });
});