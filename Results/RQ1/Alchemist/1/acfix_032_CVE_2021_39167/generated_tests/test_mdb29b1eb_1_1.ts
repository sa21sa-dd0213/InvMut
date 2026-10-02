import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mdb29b1eb - cancel function", function () {
  it("should revert when trying to cancel a completed/done operation", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy with minimal delay
    const minDelay = 1; // 1 second
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();

    // Setup: Proposer schedules an operation
    const target = executor.address; // arbitrary target
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;

    // Schedule the operation as proposer
    await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay);

    // Get operation ID
    const id = await timelock.hashOperation(target, value, data, predecessor, salt);

    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Execute the operation as executor
    await timelock.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 });

    // Now the operation is done (timestamp == _DONE_TIMESTAMP == 1)
    // Attempt to cancel the completed operation - should revert in original, but mutant may allow it
    await expect(
      timelock.connect(proposer).cancel(id)
    ).to.be.revertedWith("TimelockController: operation cannot be cancelled");
  });
});