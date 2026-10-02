import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant kill test - mcd91c82a", function () {
  it("should emit AlloSettingsUpdated event when updateAlloSettings is called by owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the RoundFactory contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by OwnableUpgradeable)
    await instance.initialize();
    
    // First add owner as a program operator so create() works if needed later
    await instance.connect(owner).updateAlloSettings(addr1.address);
    
    // Now test the event emission on updateAlloSettings
    // Set a new alloSettings address and check for event
    const newAlloSettings = addr1.address;
    
    await expect(
      instance.connect(owner).updateAlloSettings(newAlloSettings)
    )
      .to.emit(instance, "AlloSettingsUpdated")
      .withArgs(newAlloSettings);
    
    // Also verify the state was updated
    expect(await instance.alloSettings()).to.equal(newAlloSettings);
  });
});