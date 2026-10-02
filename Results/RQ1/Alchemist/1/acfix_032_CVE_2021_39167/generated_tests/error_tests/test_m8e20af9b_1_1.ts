import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m8e20af9b", function () {
  it("should allow scheduling with delay greater than minimum delay (original) and revert with exact equality (mutant)", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 86400; // 1 day in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer if needed (constructor already does this)
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.randomBytes(32);
    
    // Try to schedule with delay greater than minimum delay
    const greaterDelay = minDelay + 3600; // 1 hour more than minimum
    
    // This should succeed on original but fail on mutant
    await expect(
      instance.connect(proposer).schedule(target, value, data, predecessor, salt, greaterDelay)
    ).to.be.revertedWith("TimelockController: insufficient delay");
  });
});