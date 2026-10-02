import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - mcd91c82a", function () {
  it("should emit AlloSettingsUpdated event when updateAlloSettings is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed since it uses initializer pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set up program operator role for the owner to allow calling create if needed
    // Note: We need to add owner as program operator to satisfy the onlyProgramOperator modifier
    // However, for updateAlloSettings we only need the onlyOwner modifier
    // The owner should already be the owner after initialization
    
    // Set a new alloSettings address
    const newAlloSettings = addr1.address;
    
    // Call updateAlloSettings and expect the event to be emitted
    await expect(instance.updateAlloSettings(newAlloSettings))
      .to.emit(instance, "AlloSettingsUpdated")
      .withArgs(newAlloSettings);
  });
});