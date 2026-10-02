import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mb7778cbc test", function () {
  it("should detect mutant that removes return statement from getTimestamp", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy with minimal delay and proposers/executors
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Grant PROPOSER_ROLE to proposer for scheduling
    await instance.connect(owner).grantRole(await instance.PROPOSER_ROLE(), proposer.address);
    // Grant EXECUTOR_ROLE to executor for executing
    await instance.connect(owner).grantRole(await instance.EXECUTOR_ROLE(), executor.address);

    // Schedule an operation
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.randomBytes(32);
    const delay = minDelay + 100; // Ensure delay >= minDelay

    const tx = await instance.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      delay
    );
    await tx.wait();

    // Get the operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);

    // Call getTimestamp and verify it returns a value greater than 0
    // In the original contract this returns the scheduled timestamp
    // In the mutant it returns 0 because the return statement is removed
    const timestamp = await instance.getTimestamp(id);

    // The mutant will cause this assertion to fail because it returns 0
    expect(timestamp).to.be.gt(0, "getTimestamp should return a value greater than 0 for a scheduled operation");
  });
});