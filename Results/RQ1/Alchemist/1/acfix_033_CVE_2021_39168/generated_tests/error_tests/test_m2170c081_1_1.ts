import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test for m2170c081", function () {
  it("should detect mutant that changes + to * in _schedule", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with 1 hour minimum delay (3600 seconds)
    const minDelay = 3600;
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],  // proposers
      [executor.address]   // executors
    );
    await instance.waitForDeployment();
    
    // Grant executor role to the contract itself to allow _afterCall to succeed
    const EXECUTOR_ROLE = await instance.EXECUTOR_ROLE();
    await instance.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;
    
    // Schedule an operation with delay = minDelay (3600 seconds)
    const delay = minDelay;
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    
    // Schedule as proposer
    await instance.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      delay
    );
    
    // Compute the operation id
    const id = await instance.hashOperation(
      target,
      value,
      data,
      predecessor,
      salt
    );
    
    // Get the stored timestamp
    const storedTimestamp = await instance.getTimestamp(id);
    
    // The original computes: block.timestamp + delay
    // The mutant computes: block.timestamp * delay
    // For the original: storedTimestamp should equal currentTimestamp + delay
    // For the mutant: storedTimestamp would be currentTimestamp * delay (massively different)
    
    // Check that the stored timestamp matches the original calculation
    expect(storedTimestamp).to.equal(currentTimestamp + delay);
    
    // Verify that the operation is NOT ready immediately (before delay elapses)
    expect(await instance.isOperationReady(id)).to.be.false;
    
    // Fast forward time to just before the operation would be ready in the original
    await ethers.provider.send("evm_increaseTime", [delay - 1]);
    await ethers.provider.send("evm_mine", []);
    
    // In the original, it should still NOT be ready (1 second before delay)
    expect(await instance.isOperationReady(id)).to.be.false;
    
    // Fast forward the remaining 1 second
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    // In the original, the operation should now be ready
    // In the mutant, it would not be ready because the timestamp was computed incorrectly
    expect(await instance.isOperationReady(id)).to.be.true;
    
    // Execute the operation (should succeed in original, fail in mutant)
    await instance.connect(executor).execute(
      target,
      value,
      data,
      predecessor,
      salt,
      { value: 0 }
    );
    
    // Verify the operation is marked as done
    expect(await instance.isOperationDone(id)).to.be.true;
  });
});