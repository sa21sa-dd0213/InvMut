import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("DnGmxBatchingManager - kill mutant m8128b62e (cooldown operator)", function () {
  it("should enforce 15-minute cooldown using addition, not multiplication", async function () {
    const [owner, keeper, vault] = await ethers.getSigners();
    
    // Deploy with minimal constructor arguments
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: set keeper and vault addresses
    await instance.connect(owner).setKeeper(keeper.address);
    
    // Initialize the contract (needed to set vaultBatchingState.currentRound)
    const dummyToken = ethers.ZeroAddress;
    const dummyRouter = ethers.ZeroAddress;
    const dummyManager = ethers.ZeroAddress;
    await instance.initialize(
      dummyToken,
      dummyToken,
      dummyRouter,
      dummyManager,
      vault.address,
      keeper.address
    );
    
    // First, call executeBatchDeposit to set lastUnpauseTimestamp
    // This requires the contract to be paused first
    await instance.connect(keeper).pauseDeposit();
    
    // Call executeBatchDeposit (this will unpause and set lastUnpauseTimestamp)
    // It may revert on other checks, but the cooldown check is first
    try {
      await instance.connect(keeper).executeBatchDeposit();
    } catch (e) {
      // Expected to possibly fail on other checks, but cooldown should pass
    }
    
    // Now immediately try again - should fail with cooldown revert
    // because 0 seconds < 15 minutes (900 seconds)
    await expect(
      instance.connect(keeper).executeBatchDeposit()
    ).to.be.revertedWith("Cooldown period not passed");
    
    // Fast forward exactly 15 minutes (900 seconds)
    await time.increase(900);
    
    // Now the call should pass the cooldown check (addition: startTime + 900 < now)
    // With the mutant (multiplication: startTime * 900), this would still fail
    // because startTime * 900 is astronomically larger than current timestamp
    
    // We expect it to NOT revert with the cooldown message
    // If it reverts with another error, that's fine - the cooldown passed
    try {
      await instance.connect(keeper).executeBatchDeposit();
    } catch (e) {
      // Check it's not the cooldown revert
      expect((e as Error).message).to.not.include("Cooldown period not passed");
    }
    
    // Alternative: verify the function executes without cooldown revert
    // by checking it doesn't revert with that specific message
    const tx = instance.connect(keeper).executeBatchDeposit();
    await expect(tx).to.not.be.revertedWith("Cooldown period not passed");
  });
});