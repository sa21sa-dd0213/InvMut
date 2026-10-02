import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mc8db8ba0 detection", function () {
  it("should revert when executing an operation that is not yet ready (future timestamp)", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    const minDelay = 86400; // 1 day in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();

    // Grant executor role to executor
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    await timelock.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);

    // Schedule an operation with a delay that will make it ready in the future
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;

    // Schedule the operation as proposer
    await timelock.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      delay
    );

    // Try to execute immediately (before the delay has passed) - should revert in original
    // but mutant might allow it
    await expect(
      timelock.connect(executor).execute(
        target,
        value,
        data,
        predecessor,
        salt,
        { value: 0 }
      )
    ).to.be.revertedWith("TimelockController: operation is not ready");
  });
});