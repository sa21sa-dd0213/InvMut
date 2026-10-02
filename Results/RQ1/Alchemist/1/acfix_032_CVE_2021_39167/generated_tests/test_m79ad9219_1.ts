import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - m79ad9219", function () {
  it("should detect that _schedule uses block.timestamp - delay instead of block.timestamp + delay", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with minDelay of 1 day
    const minDelay = 86400; // 1 day in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Give executor role to the timelock itself (required for _afterCall)
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    await timelock.connect(owner).grantRole(EXECUTOR_ROLE, timelock.target);
    
    // Proposer schedules an operation with delay = minDelay
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    
    await timelock.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      minDelay
    );
    
    // Compute the operation ID
    const id = await timelock.hashOperation(target, value, data, predecessor, salt);
    
    // Get the timestamp that was stored
    const storedTimestamp = await timelock.getTimestamp(id);
    const currentBlock = await ethers.provider.getBlock("latest");
    
    // In the ORIGINAL contract: storedTimestamp = block.timestamp + delay
    // In the MUTANT: storedTimestamp = block.timestamp - delay
    
    // If mutant, storedTimestamp would be in the past (block.timestamp - delay)
    // If original, storedTimestamp would be in the future (block.timestamp + delay)
    
    // The mutant would make the operation appear ready immediately
    // because storedTimestamp <= block.timestamp (it's in the past)
    
    // Verify the operation is NOT ready yet (it should not be, since we just scheduled it)
    const isReady = await timelock.isOperationReady(id);
    
    // In the ORIGINAL: isReady should be false (timestamp in the future)
    // In the MUTANT: isReady would be true (timestamp in the past)
    // This assertion will fail on the mutant, killing it
    expect(isReady).to.equal(false);
    
    // Additional verification: the stored timestamp should be > current block timestamp
    // for a valid schedule (future execution)
    expect(storedTimestamp).to.be.gt(currentBlock.timestamp);
    
    // Verify that trying to execute immediately would revert in the original
    // but succeed in the mutant
    await expect(
      timelock.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 })
    ).to.be.reverted;
  });
});