import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant kill test - m37f2a3ad", function () {
  it("should kill mutant by calling create with non-zero alloSettings", async function () {
    const [owner, programOperator, recipient] = await ethers.getSigners();

    // Deploy RoundFactory (no constructor arguments needed - uses initializer pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Initialize the factory
    await factory.initialize();

    // Set up a program operator
    await factory.connect(owner).updateProgramOperator(programOperator.address, true);

    // Deploy a mock round implementation and set it
    const RoundImpl = await ethers.getContractFactory("RoundImplementation");
    const roundImpl = await RoundImpl.deploy();
    await roundImpl.waitForDeployment();
    await factory.connect(owner).updateRoundImplementation(roundImpl.target);

    // Set alloSettings to a non-zero address (normal configuration)
    const AlloSettings = await ethers.getContractFactory("AlloSettings");
    const alloSettings = await AlloSettings.deploy();
    await alloSettings.waitForDeployment();
    await factory.connect(owner).updateAlloSettings(alloSettings.target);

    // Attempt to create a round - should succeed on original but fail on mutant
    // Mutant requires alloSettings == address(0), so it will revert when alloSettings is non-zero
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address"],
      [recipient.address, recipient.address]
    );

    await expect(
      factory.connect(programOperator).create(encodedParams, recipient.address)
    ).to.be.revertedWith("alloSettings is 0x");
  });
});