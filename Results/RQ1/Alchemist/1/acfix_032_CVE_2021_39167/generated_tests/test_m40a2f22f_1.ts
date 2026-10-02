import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController - Mutant m40a2f22f", function () {
  it("should emit Cancelled event when an operation is cancelled", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer if not already set (constructor sets it)
    // The proposer should already have the role from constructor
    
    // Schedule an operation
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;
    
    const scheduleTx = await instance.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      delay
    );
    await scheduleTx.wait();
    
    // Get the operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Cancel the operation and expect Cancelled event
    await expect(instance.connect(proposer).cancel(id))
      .to.emit(instance, "Cancelled")
      .withArgs(id);
  });
});