import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant me7e19d20 - executeBatch length check", function () {
  it("should revert when targets.length > datas.length on original, but pass on mutant", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 100; // 100 seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant executor role to the executor signer
    const EXECUTOR_ROLE = await instance.EXECUTOR_ROLE();
    await instance.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);
    
    // Prepare arrays where targets.length > datas.length (2 targets, 1 data)
    const targets = [owner.address, executor.address];
    const values = [0, 0];
    const datas = [ethers.toUtf8Bytes("")]; // Only 1 data element
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    
    // Schedule the operation first
    const batchId = await instance.hashOperationBatch(targets, values, datas, predecessor, salt);
    await instance.connect(proposer).scheduleBatch(targets, values, datas, predecessor, salt, minDelay);
    
    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // This should revert on original contract due to length mismatch
    // On the mutant, it would pass because >= allows targets.length > datas.length
    await expect(
      instance.connect(executor).executeBatch(targets, values, datas, predecessor, salt, { value: 0 })
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});