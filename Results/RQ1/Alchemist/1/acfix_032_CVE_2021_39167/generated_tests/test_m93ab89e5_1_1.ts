import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - isOperationPending", function () {
  it("should detect mutant that changes > to < in isOperationPending", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy with minimum delay of 1 day, single proposer and executor
    const minDelay = 86400; // 1 day in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Get the operation hash for a dummy operation (we won't schedule it)
    const dummyTarget = ethers.ZeroAddress;
    const dummyValue = 0;
    const dummyData = "0x";
    const dummyPredecessor = ethers.ZeroHash;
    const dummySalt = ethers.ZeroHash;

    const nonExistentId = await instance.hashOperation(
      dummyTarget,
      dummyValue,
      dummyData,
      dummyPredecessor,
      dummySalt
    );

    // Test 1: Non-existent operation should NOT be pending
    // In original: getTimestamp returns 0, which is NOT > 1, so returns false
    // In mutant: getTimestamp returns 0, which IS < 1, so returns true (wrong!)
    const isPendingNonExistent = await instance.isOperationPending(nonExistentId);
    expect(isPendingNonExistent).to.equal(false);

    // Now schedule an actual operation to test the other direction
    const actualTarget = executor.address;
    const actualValue = 0;
    const actualData = "0x";
    const actualPredecessor = ethers.ZeroHash;
    const actualSalt = ethers.ZeroHash;

    // Connect as proposer to schedule
    const instanceAsProposer = instance.connect(proposer);
    await instanceAsProposer.schedule(
      actualTarget,
      actualValue,
      actualData,
      actualPredecessor,
      actualSalt,
      minDelay
    );

    const scheduledId = await instance.hashOperation(
      actualTarget,
      actualValue,
      actualData,
      actualPredecessor,
      actualSalt
    );

    // Test 2: Scheduled operation SHOULD be pending
    // In original: timestamp > _DONE_TIMESTAMP (1), so returns true
    // In mutant: timestamp < _DONE_TIMESTAMP would be false (wrong!)
    const isPendingScheduled = await instance.isOperationPending(scheduledId);
    expect(isPendingScheduled).to.equal(true);
  });
});