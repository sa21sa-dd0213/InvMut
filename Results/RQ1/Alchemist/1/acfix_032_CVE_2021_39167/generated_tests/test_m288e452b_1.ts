import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - getMinDelay", function () {
  it("should return the correct minimum delay after deployment", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with a non-zero minimum delay (e.g., 7 days in seconds)
    const minDelay = 7 * 24 * 60 * 60; // 604800 seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Assert that getMinDelay() returns the configured minimum delay
    const returnedDelay = await instance.getMinDelay();
    expect(returnedDelay).to.equal(minDelay);
  });
});