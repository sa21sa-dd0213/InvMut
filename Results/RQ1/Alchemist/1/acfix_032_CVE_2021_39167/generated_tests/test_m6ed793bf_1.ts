import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m6ed793bf detection", function () {
  it("should detect that isOperationDone returns false for cancelled operations (mutant bug: <= instead of ==)", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 100;
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant executor role to the contract itself (needed for _afterCall)
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    await instance.connect(owner).grantRole(TIMELOCK_ADMIN_ROLE, executor.address);
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
    await instance.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);
    
    // Schedule an operation
    const target = ethers.ZeroAddress;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;
    
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Compute operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Cancel the operation before it becomes ready
    await instance.connect(proposer).cancel(id);
    
    // After cancellation, the timestamp should be 0 (deleted)
    // Original: isOperationDone returns false (0 != 1)
    // Mutant:   isOperationDone returns true (0 <= 1) -- BUG
    expect(await instance.isOperationDone(id)).to.equal(false);
  });
});