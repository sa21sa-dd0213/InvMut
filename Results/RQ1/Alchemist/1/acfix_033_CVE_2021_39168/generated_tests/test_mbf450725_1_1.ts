import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - isOperationReady", function () {
  it("should detect mutant that changes > to < in isOperationReady", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with minimum delay of 1 second for testing
    const minDelay = 1;
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Grant proposer role to the proposer for scheduling
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    await timelock.connect(owner).grantRole(TIMELOCK_ADMIN_ROLE, proposer.address);
    
    // Schedule a simple operation
    const target = ethers.ZeroAddress;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = 60; // 60 seconds delay
    
    await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Get the operation ID
    const id = await timelock.hashOperation(target, value, data, predecessor, salt);
    
    // Verify operation is pending but not ready immediately
    expect(await timelock.isOperationPending(id)).to.be.true;
    expect(await timelock.isOperationReady(id)).to.be.false;
    
    // Advance time past the delay
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // After delay, operation should be ready
    // On the original contract this returns true
    // On the mutant (with < instead of >) this returns false, killing the mutant
    expect(await timelock.isOperationReady(id)).to.be.true;
  });
});