import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m7053964b test", function () {
  it("should revert when calling execute with predecessor = bytes32(0) in the mutant", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    const minDelay = 100; // 100 seconds minimum delay
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Schedule an operation with no predecessor (predecessor = bytes32(0))
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash; // bytes32(0)
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = minDelay;

    // Proposer schedules the operation
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);

    // Fast forward time to make the operation ready
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Execute with predecessor = bytes32(0)
    // Original: should succeed (predecessor == bytes32(0) is true)
    // Mutant: should revert because predecessor != bytes32(0) is false and isOperationDone(bytes32(0)) is false
    await expect(
      instance.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 })
    ).to.be.revertedWith("TimelockController: missing dependency");
  });
});