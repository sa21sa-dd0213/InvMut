import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - block.timestamp vs block.prevrandao", function () {
  it("should kill mutant that uses block.prevrandao instead of block.timestamp in _schedule", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with minimal delay of 1 second
    const minDelay = 1;
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer and EXECUTOR_ROLE to executor
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    
    // Setup: proposer schedules a simple ETH transfer to addr1
    const target = owner.address;
    const value = ethers.parseEther("1");
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.randomBytes(32);
    const delay = minDelay;
    
    // Schedule the operation as proposer
    await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Get the operation ID
    const id = await timelock.hashOperation(target, value, data, predecessor, salt);
    
    // Verify operation is pending (not ready yet)
    expect(await timelock.isOperationPending(id)).to.be.true;
    expect(await timelock.isOperationReady(id)).to.be.false;
    
    // Advance time by the delay period (1 second) to make operation ready
    await ethers.provider.send("evm_increaseTime", [delay]);
    await ethers.provider.send("evm_mine", []);
    
    // Now the operation should be ready on the original contract
    // On the mutant using block.prevrandao, the timestamp calculation will be wrong
    // and the operation may not be ready yet, causing execute to fail
    
    // Attempt to execute as executor
    await expect(
      timelock.connect(executor).execute(target, value, data, predecessor, salt, { value: value })
    ).to.not.be.reverted;
    
    // Verify operation is marked as done after successful execution
    expect(await timelock.isOperationDone(id)).to.be.true;
  });
});