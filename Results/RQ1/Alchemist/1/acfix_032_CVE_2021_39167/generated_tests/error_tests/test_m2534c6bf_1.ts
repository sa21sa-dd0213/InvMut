import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection", function () {
  it("should detect mutant m2534c6bf by scheduling with delay less than minDelay", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 86400; // 1 day in seconds
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],
      [executor.address]
    );
    await instance.waitForDeployment();

    // Schedule an operation with delay less than minDelay (e.g., 1 hour = 3600 seconds)
    const smallDelay = 3600; // Less than minDelay of 86400
    const target = ethers.ZeroAddress;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;

    // This should revert on original (delay >= minDelay required) but pass on mutant (delay <= minDelay)
    await expect(
      instance.connect(proposer).schedule(target, value, data, predecessor, salt, smallDelay)
    ).to.be.revertedWith("TimelockController: insufficient delay");
  });
});