import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m03fced68", function () {
  it("should kill mutant by detecting EXECUTOR_ROLE hash mismatch", async function () {
    const [owner, executor] = await ethers.getSigners();
    const minDelay = 3600; // 1 hour in seconds
    const proposers = [owner.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Compute the expected EXECUTOR_ROLE hash using keccak256 (original)
    const expectedExecutorRole = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
    
    // Get the actual EXECUTOR_ROLE from the contract
    const actualExecutorRole = await instance.EXECUTOR_ROLE();
    
    // If the mutant uses sha256, the hashes will differ
    expect(actualExecutorRole).to.equal(expectedExecutorRole);
  });
});