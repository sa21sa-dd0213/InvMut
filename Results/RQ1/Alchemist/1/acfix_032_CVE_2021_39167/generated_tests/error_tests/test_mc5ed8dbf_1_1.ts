import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mc5ed8dbf test", function () {
  it("should revert when unauthorized address tries to execute a scheduled operation with EXECUTOR_ROLE not open to everyone", async function () {
    const [owner, proposer, executor, unauthorized] = await ethers.getSigners();

    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address]; // Only executor has EXECUTOR_ROLE, not open to everyone

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Schedule an operation as proposer
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = minDelay;

    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);

    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to execute with unauthorized address (should revert in original)
    await expect(
      instance.connect(unauthorized).execute(target, value, data, predecessor, salt)
    ).to.be.reverted;
  });
});