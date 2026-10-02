import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m6d695dc2 - event emission test", function () {
  it("should emit RoundCreated event when create() is called; mutant that removes the event emission should fail this test", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory - note: constructor has no arguments per the contract code
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the factory (initializer modifier requires this)
    await instance.initialize();
    
    // Deploy a minimal mock contract to serve as roundImplementation
    // Since we need an actual contract address, deploy a simple placeholder
    const MockImpl = await ethers.getContractFactory("RoundFactory"); // Using same factory as placeholder
    const mockImpl = await MockImpl.deploy();
    await mockImpl.waitForDeployment();
    
    // Deploy a mock for alloSettings
    const AlloSettings = await ethers.getContractFactory("RoundFactory"); // Using same factory as placeholder
    const alloSettings = await AlloSettings.deploy();
    await alloSettings.waitForDeployment();
    
    // Set the roundImplementation and alloSettings addresses
    await instance.updateRoundImplementation(mockImpl.target);
    await instance.updateAlloSettings(alloSettings.target);
    
    // Add owner as a program operator to pass the modifier
    await instance.setProgramOperator(owner.address, true);
    
    // Prepare encoded parameters (empty bytes for simplicity)
    const encodedParameters = ethers.toUtf8Bytes("0x");
    
    // Call create and expect RoundCreated event
    await expect(instance.create(encodedParameters, addr1.address))
      .to.emit(instance, "RoundCreated")
      .withArgs(await instance.roundImplementation(), addr1.address, mockImpl.target);
  });
});