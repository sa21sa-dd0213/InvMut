import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m5a276f29 detection", function () {
  it("should revert when targets.length > values.length in executeBatch (original behavior)", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy with minimal delay and setup roles
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();

    // Grant executor role to the executor
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    await timelock.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);

    // Schedule a simple operation first (we need at least one scheduled operation)
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;

    const tx = await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    await tx.wait();

    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Prepare arrays with mismatched lengths: 2 targets but only 1 value
    const targets = [target, target];
    const values = [0]; // Only 1 value for 2 targets
    const datas = [data, data];

    // This should revert on the original contract due to length mismatch
    // The mutant would allow it because it uses >= instead of ==
    await expect(
      timelock.connect(executor).executeBatch(targets, values, datas, predecessor, salt)
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});