import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m0e363d0e - isOperationReady uses block.prevrandao", function () {
  it("should detect mutant by checking isOperationReady returns false when operation should be ready", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy TimelockController with required constructor arguments
    const minDelay = 3600; // 1 hour in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant proposer role to the proposer
    const TIMELOCK_ADMIN_ROLE = ethers.id("TIMELOCK_ADMIN_ROLE");
    const PROPOSER_ROLE = ethers.id("PROPOSER_ROLE");
    await instance.connect(owner).grantRole(PROPOSER_ROLE, proposer.address);
    
    // Schedule an operation
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.id("test");
    const delay = minDelay;
    
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Get the operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Verify operation is pending but not ready initially
    expect(await instance.isOperationPending(id)).to.be.true;
    expect(await instance.isOperationReady(id)).to.be.false;
    
    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // In the original contract, isOperationReady should now return true
    // In the mutant, it will compare against block.prevrandao instead of block.timestamp
    // block.prevrandao is a random value that will likely be less than the timestamp,
    // causing isOperationReady to return false when it should return true
    const isReady = await instance.isOperationReady(id);
    expect(isReady).to.be.true;
  });
});