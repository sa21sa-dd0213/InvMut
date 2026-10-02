import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - mea984ef7", function () {
  it("should detect mutant that replaces > with < in isOperation", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Grant PROPOSER_ROLE to the proposer (deployer already has TIMELOCK_ADMIN_ROLE)
    // The deployer gets TIMELOCK_ADMIN_ROLE in constructor, which can grant PROPOSER_ROLE
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    
    // Schedule a simple operation
    const target = proposer.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;
    
    // Schedule the operation as proposer
    await timelock.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      delay
    );
    
    // Compute the operation ID (same way as contract does)
    const operationId = await timelock.hashOperation(
      target,
      value,
      data,
      predecessor,
      salt
    );
    
    // The original isOperation returns true when timestamp > 0
    // The mutant returns true when timestamp < 0 (impossible)
    // After scheduling, isOperation should return true
    const isOp = await timelock.isOperation(operationId);
    
    // On the original contract this would be true
    // On the mutant this will be false (timestamp is positive, so < 0 is false)
    expect(isOp).to.equal(true);
  });
});