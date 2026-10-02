import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - m03fced68", function () {
  it("should detect EXECUTOR_ROLE hash function change from keccak256 to sha256", async function () {
    const [owner, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour in seconds
    const proposers: string[] = [owner.address];
    const executors: string[] = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Compute the expected EXECUTOR_ROLE using keccak256 (original behavior)
    const expectedExecutorRole = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
    
    // Check if the contract's EXECUTOR_ROLE constant matches keccak256
    const actualExecutorRole = await instance.EXECUTOR_ROLE();
    
    // If the mutant is present, actualExecutorRole will be sha256 hash instead of keccak256
    // This means the executor address granted the role in constructor won't have the correct role
    const hasRole = await instance.hasRole(actualExecutorRole, executor.address);
    
    // In the original contract, the executor should have the role
    // In the mutant, the executor won't have the role because the role identifier is different
    expect(hasRole).to.equal(true);
    
    // Additionally, verify the role identifier matches keccak256 to confirm no mutation
    expect(actualExecutorRole).to.equal(expectedExecutorRole);
  });
});