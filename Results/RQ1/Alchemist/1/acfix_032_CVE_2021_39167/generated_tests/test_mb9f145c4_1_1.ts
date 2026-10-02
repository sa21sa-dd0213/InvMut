import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - CallExecuted event", function () {
  it("should emit CallExecuted event when executing a scheduled operation", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy with proposers and executors
    const minDelay = 100; // 100 seconds delay
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();

    // Schedule an operation
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;

    // Proposer schedules the operation
    await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay);

    // Get the operation ID
    const operationId = await timelock.hashOperation(target, value, data, predecessor, salt);

    // Advance time past the delay
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Execute the operation and check for CallExecuted event
    await expect(
      timelock.connect(executor).execute(target, value, data, predecessor, salt, { gasLimit: 1000000 })
    )
      .to.emit(timelock, "CallExecuted")
      .withArgs(operationId, 0, target, value, data);
  });
});