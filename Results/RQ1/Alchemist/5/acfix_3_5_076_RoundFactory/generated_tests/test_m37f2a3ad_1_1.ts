import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m37f2a3ad - alloSettings == address(0) inversion", function () {
  it("should kill the mutant by setting alloSettings to a non-zero address and expecting create to succeed", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy RoundFactory - no constructor arguments needed (uses initialize)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract (onlyOwner setup)
    await instance.initialize();

    // Set the owner as a program operator
    await instance.connect(owner).updateProgramOperators(owner.address, true);

    // Deploy a mock implementation contract to set as roundImplementation
    // We need a simple contract that implements initialize(bytes,address) to avoid reverts
    const MockImpl = await ethers.getContractFactory("RoundImplementation");
    const mockImpl = await MockImpl.deploy();
    await mockImpl.waitForDeployment();

    // Update roundImplementation to a non-zero address
    await instance.connect(owner).updateRoundImplementation(mockImpl.target);

    // Set alloSettings to a non-zero address (normal expected state)
    // Deploy a simple contract to use as alloSettings
    const AlloSettings = await ethers.getContractFactory("AlloSettings");
    const alloSettingsInstance = await AlloSettings.deploy();
    await alloSettingsInstance.waitForDeployment();

    await instance.connect(owner).updateAlloSettings(alloSettingsInstance.target);

    // Verify alloSettings is non-zero (original contract would pass)
    expect(await instance.alloSettings()).to.not.equal(ethers.ZeroAddress);

    // Prepare encodedParameters (empty bytes is fine for this test)
    const encodedParameters = "0x";

    // Attempt to create a round - in original contract this succeeds,
    // in mutant it reverts because alloSettings != address(0) fails the inverted check
    await expect(
      instance.connect(owner).create(encodedParameters, owner.address)
    ).to.not.be.reverted;
  });
});