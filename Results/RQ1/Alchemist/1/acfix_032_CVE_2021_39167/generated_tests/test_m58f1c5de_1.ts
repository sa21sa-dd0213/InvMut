import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - m58f1c5de", function () {
  it("should detect missing require(success) by executing a failing call and checking operation is marked done", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy TimelockController with minimal delay
    const minDelay = 1; // 1 second
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Deploy a simple contract that always reverts on receive
    const RevertContract = await ethers.getContractFactory("RevertContract");
    const revertContract = await RevertContract.deploy();
    await revertContract.waitForDeployment();
    
    // Schedule an operation that sends ETH to the reverting contract
    const value = ethers.parseEther("1");
    const data = "0x";
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const predecessor = ethers.ZeroHash;
    
    // Proposer schedules the operation
    const scheduleTx = await timelock.connect(proposer).schedule(
      await revertContract.getAddress(),
      value,
      data,
      predecessor,
      salt,
      minDelay
    );
    await scheduleTx.wait();
    
    // Get operation ID
    const id = await timelock.hashOperation(
      await revertContract.getAddress(),
      value,
      data,
      predecessor,
      salt
    );
    
    // Wait for the delay to pass
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute the operation - this should revert in the original but succeed in the mutant
    const executeTx = await timelock.connect(executor).execute(
      await revertContract.getAddress(),
      value,
      data,
      predecessor,
      salt,
      { value: value }
    );
    await executeTx.wait();
    
    // Check that the operation is marked as done in the mutant (should not be done in original)
    const isDone = await timelock.isOperationDone(id);
    expect(isDone).to.be.true;
  });
});