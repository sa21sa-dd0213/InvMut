import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory - kill mutant m91c22590", function () {
  it("should emit RoundImplementationUpdated event when updateRoundImplementation is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed as it's OwnableUpgradeable)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set up a new implementation address
    const newImplementation = addr1.address;
    
    // Call updateRoundImplementation and check for event emission
    await expect(instance.connect(owner).updateRoundImplementation(newImplementation))
      .to.emit(instance, "RoundImplementationUpdated")
      .withArgs(newImplementation);
  });
});