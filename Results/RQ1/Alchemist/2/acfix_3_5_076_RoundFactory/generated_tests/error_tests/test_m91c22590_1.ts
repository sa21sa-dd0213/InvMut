import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory - kill mutant m91c22590", function () {
  it("should emit RoundImplementationUpdated event when updateRoundImplementation is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory - no constructor arguments needed (uses initialize)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set up a test address for the new round implementation
    const newImplementation = addr1.address;
    
    // Call updateRoundImplementation and expect the event to be emitted
    await expect(instance.updateRoundImplementation(newImplementation))
      .to.emit(instance, "RoundImplementationUpdated")
      .withArgs(newImplementation);
  });
});