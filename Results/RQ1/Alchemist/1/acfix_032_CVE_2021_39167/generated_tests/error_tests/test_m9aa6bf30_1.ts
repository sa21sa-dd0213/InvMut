import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m9aa6bf30 - isOperationDone", function () {
  it("should return true for a completed operation after execution", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with minimal delay
    const minDelay = 60; // 1 minute
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer and EXECUTOR_ROLE to executor
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
    
    // Setup roles
    await instance.connect(owner).grantRole(PROPOSER_ROLE, proposer.address);
    await instance.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);
    
    // Schedule a simple operation
    const target = ethers.ZeroAddress; // address(0) - will revert but we only need the ID
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;
    
    const id = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Schedule the operation
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Verify operation is pending but not done
    expect(await instance.isOperationDone(id)).to.be.false;
    
    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute the operation (will revert but we only care about the _afterCall marking it done)
    // Note: Since target is address(0), this will revert but the _afterCall won't be reached
    // We need a different approach - use a self-call to updateDelay which won't revert
    
    // Instead, schedule and execute an updateDelay operation
    const newDelay = 120;
    const updateData = instance.interface.encodeFunctionData("updateDelay", [newDelay]);
    const updateId = await instance.hashOperation(instance.target, 0, updateData, ethers.ZeroHash, ethers.hexlify(ethers.randomBytes(32)));
    
    await instance.connect(proposer).schedule(instance.target, 0, updateData, ethers.ZeroHash, ethers.hexlify(ethers.randomBytes(32)), delay);
    
    // Fast forward time
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute the operation
    await instance.connect(executor).execute(instance.target, 0, updateData, ethers.ZeroHash, ethers.hexlify(ethers.randomBytes(32)), { value: 0 });
    
    // Now check if the operation is marked as done
    // The mutant removes the equality check, so it would return the raw timestamp value instead of boolean true
    const isDone = await instance.isOperationDone(updateId);
    expect(isDone).to.be.true;
  });
});