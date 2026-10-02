import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mbd8c9112 detection", function () {
  it("should revert when unauthorized caller tries to execute without executor role", async function () {
    const [owner, proposer, unauthorizedUser] = await ethers.getSigners();

    // Deploy with specific roles - do NOT grant EXECUTOR_ROLE to address(0) to keep it closed
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors: string[] = []; // No executors, and not open

    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();

    // Setup: schedule an operation as proposer
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;

    // Proposer schedules the operation
    await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay);

    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);

    // The unauthorized user tries to execute - should revert on original, succeed on mutant
    await expect(
      timelock.connect(unauthorizedUser).execute(target, value, data, predecessor, salt, { value: 0 })
    ).to.be.reverted;

    // Additional verification: ensure operation is still pending (not executed)
    const id = await timelock.hashOperation(target, value, data, predecessor, salt);
    expect(await timelock.isOperationPending(id)).to.be.true;
  });
});