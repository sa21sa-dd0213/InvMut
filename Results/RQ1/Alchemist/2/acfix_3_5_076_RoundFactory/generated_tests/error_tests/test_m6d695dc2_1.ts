import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - event emission", function () {
  it("should emit RoundCreated event when create() is called successfully", async function () {
    const [owner, programOperator, ownedBy] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Initialize the factory
    await factory.initialize();
    
    // Set program operator
    await factory.connect(owner).updateAlloSettings(owner.address);
    
    // Deploy a minimal proxy implementation for roundImplementation
    // We need a simple contract that implements IRoundImplementation
    const RoundImplFactory = await ethers.getContractFactory("RoundImplementation");
    const roundImpl = await RoundImplFactory.deploy();
    await roundImpl.waitForDeployment();
    
    // Set round implementation
    await factory.connect(owner).updateRoundImplementation(await roundImpl.getAddress());
    
    // Set the program operator
    // Note: The mapping is public, we need to set it directly or via a setter
    // Since there's no setter in the contract, we'll use the program operator as the caller
    // But we need to set the mapping first - we'll simulate by using the owner as operator
    // Actually, we need to set the program operator mapping
    // Let's use the owner as the caller since they control everything
    
    // Create encoded parameters for the round
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "string"],
      [ownedBy.address, "test round"]
    );
    
    // Call create and expect event
    await expect(
      factory.connect(owner).create(encodedParameters, ownedBy.address)
    )
      .to.emit(factory, "RoundCreated")
      .withArgs(
        await factory.connect(owner).create.staticCall(encodedParameters, ownedBy.address),
        ownedBy.address,
        await roundImpl.getAddress()
      );
  });
});