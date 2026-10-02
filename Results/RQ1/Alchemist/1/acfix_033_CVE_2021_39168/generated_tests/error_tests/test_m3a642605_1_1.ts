import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m3a642605 test", function () {
  it("should revert when schedule is called from an address without PROPOSER_ROLE", async function () {
    const [owner, proposer, unauthorized] = await ethers.getSigners();
    
    // Deploy with minDelay of 1 day, one proposer, and no executors
    const minDelay = 86400; // 1 day in seconds
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, [proposer.address], []);
    await instance.waitForDeployment();
    
    // Prepare parameters for schedule
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;
    
    // Attempt to schedule from unauthorized address - should revert
    await expect(
      instance.connect(unauthorized).schedule(target, value, data, predecessor, salt, delay)
    ).to.be.reverted;
  });
});