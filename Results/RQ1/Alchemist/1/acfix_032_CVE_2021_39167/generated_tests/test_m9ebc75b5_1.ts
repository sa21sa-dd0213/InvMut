import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - executeBatch loop condition", function () {
  it("should detect mutant where for-loop condition i < targets.length is changed to i > targets.length", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with proposer and executor roles
    const minDelay = 100; // 100 seconds
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],  // proposers
      [executor.address]   // executors
    );
    await instance.waitForDeployment();

    // Create a simple target contract that will track calls
    const TargetFactory = await ethers.getContractFactory("SimpleTarget");
    const target = await TargetFactory.deploy();
    await target.waitForDeployment();

    // Prepare batch operation with one target
    const targets = [target.address];
    const values = [0];
    const datas = [target.interface.encodeFunctionData("ping")];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));

    // Schedule the batch operation as proposer
    const scheduleTx = await instance.connect(proposer).scheduleBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      minDelay
    );
    await scheduleTx.wait();

    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine");

    // Get operation id
    const id = await instance.hashOperationBatch(targets, values, datas, predecessor, salt);

    // Execute the batch operation as executor
    const executeTx = await instance.connect(executor).executeBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      { gasLimit: 1000000 }
    );
    await executeTx.wait();

    // Check if operation is done - in original it should be done, in mutant it won't be
    const isDone = await instance.isOperationDone(id);
    
    // The mutant's loop condition i > targets.length means the loop never executes,
    // so _call is never called, and _afterCall never sets _DONE_TIMESTAMP
    expect(isDone).to.equal(true, "Operation should be marked as done after execution");
    
    // Additional check: verify the target contract was actually called
    // In the original, ping() increments a counter; in mutant it stays 0
    const callCount = await target.callCount();
    expect(callCount).to.equal(1, "Target should have been called exactly once");
  });
});

// Simple target contract to track calls
// Note: This contract must be deployed separately in the test environment
// The ABI will be available through Hardhat's artifact system