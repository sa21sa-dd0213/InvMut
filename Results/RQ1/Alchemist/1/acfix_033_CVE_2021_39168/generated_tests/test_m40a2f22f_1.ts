import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test for m40a2f22f", function () {
  it("should emit Cancelled event when cancel is called on a pending operation", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 86400; // 1 day in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer (already done in constructor, but just to be safe)
    // Note: TIMELOCK_ADMIN_ROLE is needed to grant roles, owner has it from constructor
    await instance.connect(owner).grantRole(
      await instance.PROPOSER_ROLE(),
      proposer.address
    );
    
    // Schedule an operation
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;
    
    const txSchedule = await instance.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      delay
    );
    await txSchedule.wait();
    
    // Get the operation id
    const id = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Cancel the operation and expect Cancelled event
    await expect(instance.connect(proposer).cancel(id))
      .to.emit(instance, "Cancelled")
      .withArgs(id);
  });
});