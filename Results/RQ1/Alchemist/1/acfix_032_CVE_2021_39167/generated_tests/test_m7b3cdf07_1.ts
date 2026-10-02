import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - isOperationDone", function () {
  it("should detect mutant that inverts isOperationDone by verifying completed operation returns true", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with 1 second minimum delay, proposers and executors
    const minDelay = 1;
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();

    // Schedule a simple operation (call to self with no value/data)
    const target = timelock.target;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;

    // Schedule as proposer
    await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay);

    // Compute operation ID
    const operationId = await timelock.hashOperation(target, value, data, predecessor, salt);

    // Verify operation is pending but not done before execution
    expect(await timelock.isOperationPending(operationId)).to.be.true;
    expect(await timelock.isOperationDone(operationId)).to.be.false;

    // Wait for the delay to pass
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine");

    // Execute as executor
    await timelock.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 });

    // After execution, operation should be done (mutant returns false here)
    expect(await timelock.isOperationDone(operationId)).to.be.true;
    
    // Additional verification that operation is no longer pending or ready
    expect(await timelock.isOperationPending(operationId)).to.be.false;
    expect(await timelock.isOperationReady(operationId)).to.be.false;
  });
});