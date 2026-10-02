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
    
    // Set program operator - need to use the setter or direct mapping access
    // Since there's no setter for programOperators mapping, we need to access it directly
    // We'll set the program operator mapping by calling the factory contract's storage
    await ethers.provider.send("hardhat_setStorageAt", [
      factory.target,
      "0x" + "0".repeat(63) + "1", // storage slot for programOperators mapping
      ethers.zeroPadValue(programOperator.address, 32)
    ]);
    
    // Update alloSettings
    await factory.connect(owner).updateAlloSettings(owner.address);
    
    // Deploy a minimal proxy implementation for roundImplementation
    const RoundImplFactory = await ethers.getContractFactory("RoundImplementation");
    const roundImpl = await RoundImplFactory.deploy();
    await roundImpl.waitForDeployment();
    
    // Set round implementation
    await factory.connect(owner).updateRoundImplementation(await roundImpl.getAddress());
    
    // Create encoded parameters for the round
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "string"],
      [ownedBy.address, "test round"]
    );
    
    // Get the predicted clone address
    const cloneAddress = await factory.connect(programOperator).create.staticCall(encodedParameters, ownedBy.address);
    
    // Call create and expect event
    await expect(
      factory.connect(programOperator).create(encodedParameters, ownedBy.address)
    )
      .to.emit(factory, "RoundCreated")
      .withArgs(
        cloneAddress,
        ownedBy.address,
        await roundImpl.getAddress()
      );
  });
});