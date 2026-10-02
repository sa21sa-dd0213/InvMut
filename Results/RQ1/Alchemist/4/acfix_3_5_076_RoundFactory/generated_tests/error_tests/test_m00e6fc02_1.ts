import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m00e6fc02 - onlyProgramOperator modifier removal", function () {
  it("should revert when non-operator calls create() on original, but not on mutant", async function () {
    const [owner, nonOperator, randomUser] = await ethers.getSigners();
    
    // Deploy the RoundFactory (no constructor arguments needed - it uses initializer)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by OwnableUpgradeable)
    await instance.connect(owner).initialize();
    
    // Set up required addresses for create() to work
    // Deploy a simple mock contract to use as roundImplementation
    const MockImpl = await ethers.getContractFactory("IRoundImplementation");
    // We need a real contract that can be cloned - deploy a minimal proxy target
    const MinimalTarget = await ethers.getContractFactory("MinimalTarget");
    const targetImpl = await MinimalTarget.deploy();
    await targetImpl.waitForDeployment();
    
    // Update roundImplementation
    await instance.connect(owner).updateRoundImplementation(targetImpl.target);
    
    // Update alloSettings to a valid address
    const alloSettingsAddr = randomUser.address;
    await instance.connect(owner).updateAlloSettings(alloSettingsAddr);
    
    // Add nonOperator as a program operator (so the test is valid)
    await instance.connect(owner).updateProgramOperator(nonOperator.address, true);
    
    // Prepare encoded parameters (empty bytes for simplicity)
    const encodedParams = "0x";
    
    // Test 1: Non-operator should revert on original contract
    // The mutant removes onlyProgramOperator modifier, so this call would succeed on mutant
    // but revert on original
    await expect(
      instance.connect(randomUser).create(encodedParams, randomUser.address)
    ).to.be.revertedWith("Caller is not a program operator");
    
    // Test 2: Verify operator can still call successfully
    const tx = await instance.connect(nonOperator).create(encodedParams, nonOperator.address);
    const receipt = await tx.wait();
    
    // Verify RoundCreated event was emitted
    await expect(tx)
      .to.emit(instance, "RoundCreated")
      .withArgs(anyValue, nonOperator.address, targetImpl.target);
  });
});