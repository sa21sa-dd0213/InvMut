import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - isOperationDone", function () {
  it("should detect mutant that uses >= instead of == in isOperationDone", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer for scheduling
    const TIMELOCK_ADMIN_ROLE = await instance.TIMELOCK_ADMIN_ROLE();
    await instance.connect(owner).grantRole(await instance.PROPOSER_ROLE(), proposer.address);
    
    // Schedule an operation
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;
    
    const id = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Schedule the operation as proposer
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Before execution, isOperationDone should return false
    // The mutant would return true because timestamp >= 1 (which is true for pending operations)
    const isDoneBefore = await instance.isOperationDone(id);
    expect(isDoneBefore).to.equal(false);
    
    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute the operation as executor
    const EXECUTOR_ROLE = await instance.EXECUTOR_ROLE();
    await instance.connect(executor).execute(target, value, data, predecessor, salt, { 
      value: 0 
    });
    
    // After execution, isOperationDone should return true
    const isDoneAfter = await instance.isOperationDone(id);
    expect(isDoneAfter).to.equal(true);
  });
});