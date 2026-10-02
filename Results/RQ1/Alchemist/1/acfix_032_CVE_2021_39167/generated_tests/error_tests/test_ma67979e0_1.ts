import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - updateDelay event emission", function () {
  it("should emit MinDelayChange event when updateDelay is called by the timelock itself", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const minDelay = 3600; // 1 hour in seconds
    const proposers: string[] = [owner.address];
    const executors: string[] = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    const newDelay = 7200; // 2 hours
    
    // Call updateDelay from the timelock contract itself (as required by the modifier)
    // The timelock has TIMELOCK_ADMIN_ROLE, so it can execute via itself
    const tx = await instance.connect(owner).updateDelay(newDelay);
    const receipt = await tx.wait();
    
    // Check that MinDelayChange event was emitted with correct old and new delay values
    await expect(tx)
      .to.emit(instance, "MinDelayChange")
      .withArgs(minDelay, newDelay);
  });
});