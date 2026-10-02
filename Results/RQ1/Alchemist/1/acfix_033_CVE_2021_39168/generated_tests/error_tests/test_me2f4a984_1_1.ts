import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant me2f4a984 - kill test", function () {
  it("should revert when scheduling with delay exactly equal to minDelay (mutant changes >= to >)", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with a known minimum delay (e.g., 3600 seconds = 1 hour)
    const minDelay = 3600;
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Get the actual minDelay from the contract (should be 3600)
    const actualMinDelay = await instance.getMinDelay();
    expect(actualMinDelay).to.equal(minDelay);
    
    // Prepare operation parameters
    const target = ethers.ZeroAddress;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    
    // Try to schedule with delay exactly equal to minDelay
    // In original: should succeed (delay >= minDelay)
    // In mutant: should revert (delay > minDelay, but delay == minDelay fails)
    await expect(
      instance.connect(proposer).schedule(
        target,
        value,
        data,
        predecessor,
        salt,
        actualMinDelay // Use exact minDelay value
      )
    ).to.be.revertedWith("TimelockController: insufficient delay");
  });
});