import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m3a642605 test", function () {
  it("should revert when schedule is called by an address without PROPOSER_ROLE", async function () {
    const [owner, proposer, unauthorized] = await ethers.getSigners();
    
    // Deploy with proposers array containing only the proposer address
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [owner.address]; // any executor is fine for deployment
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Prepare a simple schedule call
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;
    
    // Attempt to schedule from unauthorized address - should revert on original but succeed on mutant
    await expect(
      instance.connect(unauthorized).schedule(target, value, data, predecessor, salt, delay)
    ).to.be.reverted;
  });
});