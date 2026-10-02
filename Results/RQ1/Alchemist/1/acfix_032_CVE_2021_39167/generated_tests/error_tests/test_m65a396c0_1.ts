import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m65a396c0 test", function () {
  it("should kill mutant by checking isOperation returns boolean for scheduled operation", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 100; // 100 seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Give proposer role to owner for test setup
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    
    // Schedule a simple operation
    const target = ethers.ZeroAddress;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    
    // Schedule operation from proposer
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, minDelay);
    
    // Get the operation ID
    const operationId = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Call isOperation - this should return true (boolean) for scheduled operation
    // Mutant returns raw timestamp instead of boolean, which would be a number > 0
    const result = await instance.isOperation(operationId);
    
    // If mutant returns raw timestamp (e.g., block.timestamp + delay), it would be a BigInt
    // Original returns boolean true, which equals true
    // Mutant would return BigInt which when compared to boolean true would fail
    expect(result).to.equal(true);
  });
});