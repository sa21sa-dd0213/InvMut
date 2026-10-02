import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant mb6029fdf - updateAlloSettings", function () {
  it("should kill the mutant by verifying alloSettings is updated correctly", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory - note: it uses initializer pattern, not constructor
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by OwnableUpgradeable pattern)
    await instance.initialize();
    
    // First, add owner as a program operator to enable create function later if needed
    // But for this test we just need to call updateAlloSettings
    
    // Set a specific address for alloSettings
    const testAddress = "0x1234567890123456789012345678901234567890";
    
    // Call updateAlloSettings with the test address
    await instance.updateAlloSettings(testAddress);
    
    // Read back the alloSettings value
    const storedAlloSettings = await instance.alloSettings();
    
    // The original contract would store testAddress
    // The mutant would store address(0) instead
    // This assertion should fail (kill) the mutant
    expect(storedAlloSettings).to.equal(testAddress);
    
    // Additional verification: the event should also be checked
    await expect(instance.updateAlloSettings(testAddress))
      .to.emit(instance, "AlloSettingsUpdated")
      .withArgs(testAddress);
  });
});