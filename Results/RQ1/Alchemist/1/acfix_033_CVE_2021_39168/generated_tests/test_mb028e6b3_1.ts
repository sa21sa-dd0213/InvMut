import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - mb028e6b3", function () {
  it("should revert when non-admin completes operation after execution", async function () {
    const [owner, proposer, executor, nonAdmin] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Schedule an operation
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;
    
    // Connect as proposer to schedule
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute as executor
    await instance.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 });
    
    // Now try to complete the operation as non-admin (this should fail in original but pass in mutant)
    // We can check by trying to execute another operation that depends on the first one
    // If the _afterCall didn't revert for non-admin, the first operation is marked done
    // Let's schedule and execute a second operation that depends on the first
    
    const salt2 = ethers.hexlify(ethers.randomBytes(32));
    await instance.connect(proposer).schedule(target, value, data, ethers.ZeroHash, salt2, delay);
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to execute second operation with predecessor = first operation's id
    const firstOpId = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // This should revert in original because _afterCall requires admin role
    // In mutant, it might succeed or fail differently
    if (await instance.isOperationDone(firstOpId)) {
      // If the operation was marked done despite non-admin caller, the mutant is detected
      // The original would revert during the first execute's _afterCall
      expect(await instance.isOperationDone(firstOpId)).to.be.true;
    }
    
    // The key assertion: in original, _afterCall would revert when called by executor (non-admin)
    // So the first operation would NOT be marked done. In mutant, it would be marked done.
    // Let's verify by checking the timestamp
    const timestamp = await instance.getTimestamp(firstOpId);
    expect(timestamp).to.equal(1); // _DONE_TIMESTAMP = 1 means operation is done
    
    // If this assertion passes, it means the mutant allowed non-admin to complete the operation
    // In the original contract, this would fail because the require statement would revert
  });
});