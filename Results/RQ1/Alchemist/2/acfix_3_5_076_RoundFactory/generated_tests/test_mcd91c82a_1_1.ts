import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - mcd91c82a", function () {
  it("should emit AlloSettingsUpdated event when updateAlloSettings is called", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the factory (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize();

    // Set a new alloSettings address
    const newAlloSettings = addr1.address;

    // Call updateAlloSettings and capture the transaction
    const tx = await instance.connect(owner).updateAlloSettings(newAlloSettings);
    await tx.wait();

    // Assert that the AlloSettingsUpdated event was emitted with the correct parameter
    await expect(tx)
      .to.emit(instance, "AlloSettingsUpdated")
      .withArgs(newAlloSettings);
  });

  it("should revert when non-owner calls updateAlloSettings", async function () {
    const [owner, addr1] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    await instance.initialize();

    // Non-owner tries to call updateAlloSettings - should revert
    await expect(
      instance.connect(addr1).updateAlloSettings(addr1.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});