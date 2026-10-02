import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - m20fa4198", function () {
  it("should revert when executing an operation before its timelock delay has passed", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    const minDelay = 86400; // 1 day in seconds
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],
      [executor.address]
    );
    await instance.waitForDeployment();

    // Grant executor role to the test executor
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));

    // Schedule an operation from proposer
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = minDelay;

    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);

    // Attempt to execute immediately (before delay has passed) from executor
    await expect(
      instance.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 })
    ).to.be.revertedWith("TimelockController: operation is not ready");
  });
});