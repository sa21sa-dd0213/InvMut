import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - insufficient delay validation", function () {
  it("should revert when scheduling with delay less than minimum delay", async function () {
    const [owner, proposer] = await ethers.getSigners();

    const minDelay = 3600; // 1 hour in seconds
    const proposers = [proposer.address];
    const executors = [owner.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Attempt to schedule an operation with delay less than minimum
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const insufficientDelay = minDelay - 1; // 3599 seconds - less than minimum

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