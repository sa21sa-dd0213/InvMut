import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mba6ee9a8 test", function () {
  it("should kill mutant by verifying executor role was granted during construction", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Verify that the executor has the EXECUTOR_ROLE
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
    const hasExecutorRole = await instance.hasRole(EXECUTOR_ROLE, executor.address);
    
    // This assertion will pass on the original contract but fail on the mutant
    // because the mutant's loop condition i > executors.length prevents role assignment
    expect(hasExecutorRole).to.equal(true);
  });
});