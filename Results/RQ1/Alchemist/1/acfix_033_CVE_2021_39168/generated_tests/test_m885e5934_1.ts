import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test for _beforeCall", function () {
  it("should revert when executing with a non-zero predecessor that is not done", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with minimum delay of 1 second
    const minDelay = 1;
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant executor role to address(0) to allow open execution
    const EXECUTOR_ROLE = await instance.EXECUTOR_ROLE();
    await instance.connect(owner).grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
    
    // Schedule an operation that will serve as a predecessor
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    
    // Schedule the first operation (will be our predecessor)
    const tx1 = await instance.connect(proposer).schedule(
      target,
      value,
      data,
      ethers.ZeroHash,
      salt,
      minDelay
    );
    await tx1.wait();
    
    // Get the operation id for the first scheduled operation
    const id1 = await instance.hashOperation(target, value, data, ethers.ZeroHash, salt);
    
    // Wait for the first operation to become ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute the first operation (this completes it)
    const tx2 = await instance.connect(executor).execute(
      target,
      value,
      data,
      ethers.ZeroHash,
      salt,
      { value: 0 }
    );
    await tx2.wait();
    
    // Now try to execute a new operation with the completed predecessor
    const newSalt = ethers.keccak256(ethers.toUtf8Bytes("newTest"));
    const tx3 = await instance.connect(proposer).schedule(
      target,
      value,
      data,
      id1,  // predecessor is the completed operation
      newSalt,
      minDelay
    );
    await tx3.wait();
    
    // Wait for the new operation to become ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // This should succeed - predecessor is completed
    const tx4 = await instance.connect(executor).execute(
      target,
      value,
      data,
      id1,  // completed predecessor
      newSalt,
      { value: 0 }
    );
    await tx4.wait();
    
    // Now test the mutant: try to execute with a non-existent predecessor
    const nonExistentPredecessor = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
    const anotherSalt = ethers.keccak256(ethers.toUtf8Bytes("anotherTest"));
    
    const tx5 = await instance.connect(proposer).schedule(
      target,
      value,
      data,
      nonExistentPredecessor,
      anotherSalt,
      minDelay
    );
    await tx5.wait();
    
    // Wait for it to become ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // This should revert in the original but succeed in the mutant
    // because the mutant has predecessor >= bytes32(0) which always passes
    await expect(
      instance.connect(executor).execute(
        target,
        value,
        data,
        nonExistentPredecessor,
        anotherSalt,
        { value: 0 }
      )
    ).to.be.revertedWith("TimelockController: missing dependency");
  });
});