import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - insufficient delay", function () {
  it("should revert when scheduling with delay less than minimum delay", async function () {
    const [owner, proposer] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour in seconds
    const proposers = [proposer.address];
    const executors = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Try to schedule with delay less than minimum
    const insufficientDelay = 100; // Less than minDelay of 3600
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    
    // This should revert on the original contract but succeed on the mutant
    await expect(
      instance.connect(proposer).schedule(
        target,
        value,
        data,
        predecessor,
        salt,
        insufficientDelay
      )
    ).to.be.revertedWith("TimelockController: insufficient delay");
  });
});