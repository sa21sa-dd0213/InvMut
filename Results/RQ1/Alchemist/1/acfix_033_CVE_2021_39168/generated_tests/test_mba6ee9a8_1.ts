import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - mba6ee9a8", function () {
  it("should fail when executors are not granted EXECUTOR_ROLE due to broken constructor loop", async function () {
    const [owner, executor1, executor2] = await ethers.getSigners();
    
    // Deploy with executors array - mutant will skip granting roles
    const minDelay = 3600; // 1 hour
    const proposers = [owner.address];
    const executors = [executor1.address, executor2.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Attempt to execute a scheduled operation from an executor address
    // First schedule an operation as proposer
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;
    
    await timelock.connect(owner).schedule(target, value, data, predecessor, salt, delay);
    
    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to execute from executor1 - should revert because executor1 doesn't have EXECUTOR_ROLE
    await expect(
      timelock.connect(executor1).execute(target, value, data, predecessor, salt)
    ).to.be.revertedWith(
      "AccessControl: account " + executor1.address.toLowerCase() + " is missing role " + 
      ethers.id("EXECUTOR_ROLE").toLowerCase()
    );
  });
});