import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m2b29755b", function () {
  it("should kill the mutant by showing operation becomes ready immediately due to block.prevrandao instead of block.timestamp", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE and EXECUTOR_ROLE to the timelock itself for execution
    const timelockAddress = await instance.getAddress();
    await instance.connect(owner).grantRole(await instance.PROPOSER_ROLE(), timelockAddress);
    await instance.connect(owner).grantRole(await instance.EXECUTOR_ROLE(), timelockAddress);
    
    // Schedule an operation
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;
    
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Get the operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Initially the operation should be pending (not ready)
    expect(await instance.isOperationPending(id)).to.be.true;
    expect(await instance.isOperationReady(id)).to.be.false;
    
    // In the original contract, we would need to wait minDelay seconds
    // But with the mutant using block.prevrandao, the operation might be immediately ready
    // because block.prevrandao is a random value, not a timestamp
    
    // Try to execute immediately - should fail on original but may succeed on mutant
    // If it succeeds, that proves the mutant is broken (operation becomes ready too early)
    try {
      await instance.connect(executor).execute(target, value, data, predecessor, salt, { gasLimit: 1000000 });
      // If execution succeeds, the mutant is detected because operation should not be ready yet
      expect(await instance.isOperationDone(id)).to.be.true;
    } catch (error: any) {
      // If it reverts, check if it reverted for the wrong reason
      // The mutant might still revert but with a different error than expected
      expect(error.message).to.not.contain("TimelockController: operation is not ready");
    }
    
    // Alternative: check if the timestamp was set incorrectly
    const timestamp = await instance.getTimestamp(id);
    const currentBlock = await ethers.provider.getBlock("latest");
    // On original: timestamp should be currentBlock.timestamp + delay
    // On mutant: timestamp will be block.prevrandao + delay (not related to actual time)
    expect(timestamp).to.not.equal(BigInt(currentBlock!.timestamp) + BigInt(delay));
  });
});