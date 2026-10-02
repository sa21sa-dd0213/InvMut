import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - isOperationReady", function () {
  it("should detect mutant by verifying operation readiness after delay", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with minimal delay of 1 second
    const minDelay = 1;
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer (already done in constructor) and EXECUTOR_ROLE to executor
    // Now schedule an operation as proposer
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.randomBytes(32);
    const delay = 2; // 2 seconds delay
    
    // Schedule the operation
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Wait for the delay to pass
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Get operation ID
    const operationId = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // The original should return true, the mutant returns false (due to empty return)
    const isReady = await instance.isOperationReady(operationId);
    
    // This assertion will fail on the mutant because it returns false instead of true
    expect(isReady).to.equal(true);
  });
});