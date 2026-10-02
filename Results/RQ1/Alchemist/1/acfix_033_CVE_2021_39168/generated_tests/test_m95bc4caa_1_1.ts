import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m95bc4caa", function () {
  it("should detect isOperationReady operator change from <= to >=", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with 1 day minimum delay
    const minDelay = 86400; // 1 day in seconds
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],  // proposers
      [executor.address]   // executors
    );
    await instance.waitForDeployment();

    // Grant TIMELOCK_ADMIN_ROLE to executor for _afterCall
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    await instance.connect(owner).grantRole(TIMELOCK_ADMIN_ROLE, executor.address);

    // Schedule an operation
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = minDelay;

    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Get the operation id
    const id = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Initially operation should not be ready
    expect(await instance.isOperationReady(id)).to.be.false;
    
    // Advance time past the delay
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // In original: isOperationReady returns true (timestamp <= block.timestamp)
    // In mutant: isOperationReady returns false (timestamp >= block.timestamp is false when timestamp < block.timestamp)
    // This will cause execute to revert in the mutant due to _afterCall check
    
    // Attempt to execute - should succeed on original, fail on mutant
    await expect(
      instance.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 })
    ).to.be.reverted;
  });
});