import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - isOperationReady with block.prevrandao", function () {
  it("should kill mutant by checking isOperationReady returns true after delay, but block.prevrandao causes false", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 86400; // 1 day in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Prepare a simple operation
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    
    // Schedule the operation with delay equal to minDelay
    const tx = await instance.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      minDelay
    );
    await tx.wait();
    
    // Get the operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Initially the operation should not be ready
    expect(await instance.isOperationReady(id)).to.be.false;
    
    // Increase time to pass the delay
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // After the delay, the operation SHOULD be ready (original behavior)
    // But with the mutant using block.prevrandao instead of block.timestamp,
    // this assertion will fail, killing the mutant
    expect(await instance.isOperationReady(id)).to.be.true;
  });
});