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
    
    // Set a new alloSettings address
    const newAlloSettings = addr1.address;
    
    // Call updateAlloSettings and expect the event to be emitted
    await expect(instance.updateAlloSettings(newAlloSettings))
      .to.emit(instance, "AlloSettingsUpdated")
      .withArgs(newAlloSettings);
  });
});