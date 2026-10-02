import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - getMinDelay", function () {
  it("should return the configured minimum delay after deployment", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TimelockController");
    
    // Deploy with a non-zero minimum delay (e.g., 86400 seconds = 1 day)
    const minDelay = 86400;
    const proposers: string[] = [owner.address];
    const executors: string[] = [owner.address];
    
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Call getMinDelay and verify it returns the configured value
    const returnedDelay = await instance.getMinDelay();
    
    // The original contract returns _minDelay (86400), but the mutant returns 0
    expect(returnedDelay).to.equal(minDelay);
  });
});