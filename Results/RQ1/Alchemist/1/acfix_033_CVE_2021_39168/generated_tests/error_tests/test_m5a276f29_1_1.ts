import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - executeBatch length validation", function () {
  it("should revert when targets.length > values.length (mutant allows this, original reverts)", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy TimelockController with minimal delay (1 second) and setup roles
    const minDelay = 1;
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Prepare data for executeBatch where targets.length > values.length
    const targets = [owner.address, owner.address, owner.address]; // 3 targets
    const values = [0, 0]; // 2 values (mismatch)
    const datas = ["0x", "0x"]; // 2 data items
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;

    // Schedule the operation first (needs proposer role)
    const batchId = await instance.hashOperationBatch(targets, values, datas, predecessor, salt);
    await instance.connect(proposer).scheduleBatch(targets, values, datas, predecessor, salt, minDelay);

    // Advance time to make operation ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to execute - should revert in original due to length mismatch
    // Mutant with >= would allow it and proceed
    await expect(
      instance.connect(executor).executeBatch(targets, values, datas, predecessor, salt, { value: 0 })
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});