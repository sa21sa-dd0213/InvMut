import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - _beforeCall operator change", function () {
  it("should kill mutant ma78a744d by executing operation with zero predecessor when no predecessor is done", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 100; // 100 seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Schedule an operation with a non-zero predecessor that will never be done
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const nonZeroPredecessor = ethers.keccak256(ethers.toUtf8Bytes("some_predecessor"));
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test_salt"));
    
    // Schedule operation with a predecessor (this will never be executed, so it stays pending)
    await timelock.connect(proposer).schedule(
      target,
      value,
      data,
      nonZeroPredecessor,
      salt,
      minDelay
    );
    
    // Now schedule and execute an operation with zero predecessor (no dependency)
    const salt2 = ethers.keccak256(ethers.toUtf8Bytes("test_salt2"));
    
    await timelock.connect(proposer).schedule(
      target,
      value,
      data,
      ethers.ZeroHash, // zero predecessor (no dependency)
      salt2,
      minDelay
    );
    
    // Fast forward time to make the second operation ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to execute the second operation with zero predecessor
    // This should succeed on the original (OR logic) but fail on the mutant (AND logic)
    const tx = timelock.connect(executor).execute(
      target,
      value,
      data,
      ethers.ZeroHash, // zero predecessor
      salt2
    );
    
    // The mutant will revert because it requires BOTH zero predecessor AND isOperationDone(predecessor)
    // Since predecessor is zero but isOperationDone(0) returns false, the AND condition fails
    await expect(tx).to.be.revertedWith("TimelockController: missing dependency");
  });
});