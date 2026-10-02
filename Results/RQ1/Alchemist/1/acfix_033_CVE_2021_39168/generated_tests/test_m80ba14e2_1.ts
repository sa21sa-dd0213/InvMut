import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - isOperation", function () {
  it("should detect mutant where isOperation uses >= instead of > by checking an unscheduled operation", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy TimelockController with minDelay, proposers, and executors
    const minDelay = 3600; // 1 hour
    const proposers = [owner.address];
    const executors = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Generate a random operation ID that was never scheduled
    const unscheduledId = ethers.keccak256(ethers.toUtf8Bytes("unscheduled_operation"));
    
    // In the original contract, isOperation should return false for an unscheduled operation
    // In the mutant with >= 0, it would return true because getTimestamp returns 0
    const result = await instance.isOperation(unscheduledId);
    
    // The original contract returns false for unscheduled operations
    // The mutant would incorrectly return true
    expect(result).to.equal(false);
  });
});