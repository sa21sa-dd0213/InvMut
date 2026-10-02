import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m41e0be5c", function () {
  let instance: any;
  let owner: any;
  let proposer: any;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    proposer = signers[1];

    const minDelay = 86400; // 1 day in seconds
    const proposers = [proposer.address];
    const executors = [owner.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
  });

  it("should emit CallScheduled event when schedule is called by proposer", async function () {
    const target = ethers.ZeroAddress;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = 86400;

    // Compute the expected operation id
    const id = await instance.hashOperation(target, value, data, predecessor, salt);

    // Call schedule and expect the CallScheduled event to be emitted
    await expect(
      instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay)
    )
      .to.emit(instance, "CallScheduled")
      .withArgs(id, 0, target, value, data, predecessor, delay);
  });
});