import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - isOperationReady", function () {
  it("should detect mutant where isOperationReady uses >= instead of <=", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with minimum delay of 1 hour (3600 seconds)
    const minDelay = 3600;
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address], // proposers
      [executor.address]  // executors
    );
    await instance.waitForDeployment();

    // Grant PROPOSER_ROLE and EXECUTOR_ROLE to the contract itself for testing
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));

    // Schedule an operation with a delay that puts it in the future
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));

    // Schedule with a large delay (e.g., 7 days) to ensure it's not ready yet
    const futureDelay = 7 * 24 * 3600; // 7 days in seconds
    
    await instance.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      futureDelay
    );

    // Get the operation ID
    const operationId = await instance.hashOperation(
      target,
      value,
      data,
      predecessor,
      salt
    );

    // Immediately check if operation is ready - it should NOT be ready because
    // the scheduled time is in the future (block.timestamp + futureDelay > block.timestamp)
    const isReady = await instance.isOperationReady(operationId);
    
    // The original contract would return false (timestamp > block.timestamp)
    // The mutant would return true (timestamp >= block.timestamp) - which is incorrect
    expect(isReady).to.equal(false, 
      "Operation should not be ready as its scheduled time is in the future"
    );
  });
});