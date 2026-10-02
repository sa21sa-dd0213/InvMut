import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant md66f72e0 - hashOperation uses sha256 instead of keccak256", function () {
  it("should fail to execute a scheduled operation due to hash mismatch from sha256 vs keccak256", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 60; // 1 minute
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;
    
    // Schedule the operation as proposer
    await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Compute the operation ID using the original keccak256 method (as the original contract would)
    const originalId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256", "bytes", "bytes32", "bytes32"],
        [target, value, data, predecessor, salt]
      )
    );
    
    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to execute - this should fail because the mutant computes sha256 internally
    // while the stored timestamp uses keccak256
    await expect(
      timelock.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 })
    ).to.be.revertedWith("TimelockController: operation is not ready");
  });
});