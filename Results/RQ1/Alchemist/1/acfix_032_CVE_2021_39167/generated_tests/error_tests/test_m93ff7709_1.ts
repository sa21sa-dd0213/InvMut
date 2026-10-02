import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m93ff7709 test", function () {
  it("should revert when non-executor tries to execute a scheduled operation", async function () {
    const [owner, proposer, nonExecutor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [owner.address]; // Only owner is executor, not nonExecutor
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Grant proposer role to the proposer
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    await timelock.connect(owner).grantRole(PROPOSER_ROLE, proposer.address);
    
    // Schedule an operation as proposer
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = minDelay;
    
    await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Non-executor should NOT be able to execute - this should revert on original
    // but might succeed on mutant (which removes the executor role check)
    await expect(
      timelock.connect(nonExecutor).execute(target, value, data, predecessor, salt, { value: 0 })
    ).to.be.reverted;
  });
});