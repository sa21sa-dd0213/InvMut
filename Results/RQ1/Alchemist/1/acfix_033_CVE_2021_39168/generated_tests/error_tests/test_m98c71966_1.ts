import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - isOperationReady", function () {
  it("should kill mutant m98c71966 by checking isOperationReady returns false for pending operation", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with minimal delay and proposers/executors
    const minDelay = 3600; // 1 hour delay
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],
      [executor.address]
    );
    await instance.waitForDeployment();

    // Get the PROPOSER_ROLE hash
    const PROPOSER_ROLE = await instance.PROPOSER_ROLE();
    
    // Grant PROPOSER_ROLE to proposer if needed (constructor already sets it)
    // Schedule an operation with a future delay
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;

    // Schedule the operation as proposer
    await instance.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      delay
    );

    // Get the operation ID
    const operationId = await instance.hashOperation(
      target,
      value,
      data,
      predecessor,
      salt
    );

    // The operation is pending (scheduled but not ready since delay hasn't passed)
    // isOperationPending should return true
    const isPending = await instance.isOperationPending(operationId);
    expect(isPending).to.equal(true);

    // isOperationReady should return false because timestamp > block.timestamp + delay
    // The mutant with || would incorrectly return true
    const isReady = await instance.isOperationReady(operationId);
    expect(isReady).to.equal(false); // This will kill the mutant
  });
});