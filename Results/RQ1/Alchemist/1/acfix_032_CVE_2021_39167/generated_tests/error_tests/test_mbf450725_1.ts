import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - isOperationReady", function () {
  it("should detect mutant that changes > to < in isOperationReady", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with minDelay = 1 second
    const minDelay = 1;
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Grant EXECUTOR_ROLE to the timelock itself (needed for _afterCall)
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    await timelock.connect(owner).grantRole(EXECUTOR_ROLE, await timelock.getAddress());
    
    // Schedule a simple operation
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;
    
    // Proposer schedules the operation
    await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Get the operation ID
    const id = await timelock.hashOperation(target, value, data, predecessor, salt);
    
    // Before delay passes, operation should be pending but NOT ready
    expect(await timelock.isOperationPending(id)).to.be.true;
    expect(await timelock.isOperationReady(id)).to.be.false;
    
    // Wait for delay to pass
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine");
    
    // After delay, operation should be ready (timestamp > _DONE_TIMESTAMP && timestamp <= block.timestamp)
    // Original returns true; mutant with < returns false
    expect(await timelock.isOperationReady(id)).to.be.true;
    
    // Also verify we can execute the operation (which confirms it's ready)
    await timelock.connect(executor).execute(target, value, data, predecessor, salt);
    
    // After execution, operation should be done
    expect(await timelock.isOperationDone(id)).to.be.true;
  });
});