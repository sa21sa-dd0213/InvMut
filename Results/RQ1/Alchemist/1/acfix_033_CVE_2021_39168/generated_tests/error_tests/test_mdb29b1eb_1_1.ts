import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mdb29b1eb - cancel without pending check", function () {
  it("should revert when trying to cancel a completed operation, but mutant allows it", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 100; // 100 seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer for scheduling
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
    
    await instance.connect(owner).grantRole(PROPOSER_ROLE, proposer.address);
    await instance.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);
    
    // Schedule a simple operation
    const target = proposer.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = minDelay + 10;
    
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute the operation (this completes it)
    await instance.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 });
    
    // Now try to cancel the completed operation
    // On the original contract this should revert because operation is done (not pending)
    // On the mutant it will succeed because the require check is removed
    const operationId = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Verify operation is done
    expect(await instance.isOperationDone(operationId)).to.be.true;
    
    // This should revert on original, but mutant will allow it
    await expect(
      instance.connect(proposer).cancel(operationId)
    ).to.be.revertedWith("TimelockController: operation cannot be cancelled");
  });
});