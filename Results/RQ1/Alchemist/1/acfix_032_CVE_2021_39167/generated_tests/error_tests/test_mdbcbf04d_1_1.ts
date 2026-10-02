import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController - kill mutant mdbcbf04d", function () {
  it("should revert when executing exactly at the scheduled timestamp (detects <= vs < mutation in isOperationReady)", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    const minDelay = 86400; // 1 day in seconds
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],
      [executor.address]
    );
    await instance.waitForDeployment();

    // Grant executor role to the contract itself (needed for _afterCall)
    const EXECUTOR_ROLE = await instance.EXECUTOR_ROLE();
    await instance.connect(owner).grantRole(EXECUTOR_ROLE, instance.target);

    // Schedule an operation
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;

    await instance
      .connect(proposer)
      .schedule(target, value, data, predecessor, salt, delay);

    // Get the operation ID
    const id = await instance.hashOperation(
      target,
      value,
      data,
      predecessor,
      salt
    );

    // Mine blocks to advance time to exactly the scheduled timestamp
    const currentTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;
    const scheduledTimestamp = currentTimestamp + delay;
    const timeToAdvance = scheduledTimestamp - (await ethers.provider.getBlock("latest"))!.timestamp;

    await ethers.provider.send("evm_increaseTime", [timeToAdvance]);
    await ethers.provider.send("evm_mine");

    // Verify that the current block timestamp equals the scheduled timestamp
    const latestBlock = await ethers.provider.getBlock("latest");
    expect(latestBlock!.timestamp).to.equal(scheduledTimestamp);

    // This should succeed on the original (<=) but fail on the mutant (<)
    await expect(
      instance.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 })
    ).to.be.revertedWith("TimelockController: operation is not ready");
  });
});