import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - mcd91c82a", function () {
  it("should detect missing AlloSettingsUpdated event emission", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, add owner as program operator to pass the modifier
    await instance.connect(owner).initialize();
    await instance.connect(owner).updateAlloSettings(owner.address);

    // Now test the event emission for updateAlloSettings
    const newAlloSettings = addr1.address;

    // Listen for the AlloSettingsUpdated event
    await expect(instance.connect(owner).updateAlloSettings(newAlloSettings))
      .to.emit(instance, "AlloSettingsUpdated")
      .withArgs(newAlloSettings);
  });
});