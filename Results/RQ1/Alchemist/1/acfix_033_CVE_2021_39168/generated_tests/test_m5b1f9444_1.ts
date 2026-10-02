import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test m5b1f9444", function () {
  it("should revert when scheduling the same operation twice", async function () {
    const [owner, proposer] = await ethers.getSigners();
    
    // Deploy TimelockController with required constructor arguments
    const minDelay = 3600; // 1 hour in seconds
    const proposers = [proposer.address];
    const executors = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Prepare operation parameters
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;

    // First schedule should succeed
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);

    // Second schedule with same parameters should revert
    await expect(
      instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay)
    ).to.be.revertedWith("TimelockController: operation already scheduled");
  });
});