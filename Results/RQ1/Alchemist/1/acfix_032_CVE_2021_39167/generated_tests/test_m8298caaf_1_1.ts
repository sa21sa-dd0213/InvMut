import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - isOperationPending", function () {
  it("should detect mutant that changes > to >= in isOperationPending", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Give executor role to the contract itself so _afterCall works
    const EXECUTOR_ROLE = await instance.EXECUTOR_ROLE();
    await instance.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);
    
    // Schedule a simple operation
    const target = ethers.ZeroAddress;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    
    // Connect as proposer to schedule
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, minDelay);
    
    // Get operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Warp time past the delay
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute the operation
    await instance.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 });
    
    // After execution, the timestamp should be _DONE_TIMESTAMP (1)
    // Original: isOperationPending returns false (1 > 1 is false)
    // Mutant: isOperationPending returns true (1 >= 1 is true)
    // So this assertion should fail on the mutant
    expect(await instance.isOperationPending(id)).to.equal(false);
  });
});