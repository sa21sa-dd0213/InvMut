import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant mcd91c82a - event emission test", function () {
  it("should emit AlloSettingsUpdated event when updateAlloSettings is called by owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed as it uses initializer pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set the caller as a program operator to enable create function if needed
    // But for this test, we only need to call updateAlloSettings which requires onlyOwner
    
    // Set a valid roundImplementation address to avoid issues with other functions
    const mockAddress = "0x0000000000000000000000000000000000000001";
    await instance.updateRoundImplementation(mockAddress);
    
    // Set alloSettings to a non-zero address first (optional, just for setup)
    const newAlloSettings = addr1.address;
    
    // Call updateAlloSettings and expect the event to be emitted
    await expect(instance.updateAlloSettings(newAlloSettings))
      .to.emit(instance, "AlloSettingsUpdated")
      .withArgs(newAlloSettings);
  });
});