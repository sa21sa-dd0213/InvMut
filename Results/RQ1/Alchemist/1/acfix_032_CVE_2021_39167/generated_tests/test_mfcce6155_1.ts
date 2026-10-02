import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mfcce6155", function () {
  it("should revert when targets.length is less than values.length in executeBatch", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant EXECUTOR_ROLE to the executor signer for _afterCall
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    
    // Setup: schedule an operation first so it can be executed
    const target = ethers.ZeroAddress;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = minDelay;
    
    // Schedule the operation as proposer
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Fast forward time to make the operation ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Now try to executeBatch with mismatched array lengths
    const targets = [target]; // 1 target
    const values = [value, value]; // 2 values - this should cause revert in original
    const datas = [data];
    
    // In the original contract, require(targets.length == values.length) would revert
    // In the mutant, require(targets.length <= values.length) would pass
    await expect(
      instance.connect(executor).executeBatch(targets, values, datas, predecessor, salt)
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});