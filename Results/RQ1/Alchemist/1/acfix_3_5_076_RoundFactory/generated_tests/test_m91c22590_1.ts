import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m91c22590 - event emission", function () {
  it("should emit RoundImplementationUpdated when updateRoundImplementation is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed - uses initialize pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by OwnableUpgradeable pattern)
    await instance.initialize();
    
    // Deploy a mock implementation address (any contract address will do)
    const MockImplementation = await ethers.getContractFactory("RoundFactory");
    const mockImpl = await MockImplementation.deploy();
    await mockImpl.waitForDeployment();
    const mockImplAddress = await mockImpl.getAddress();
    
    // Call updateRoundImplementation and check for event emission
    await expect(instance.connect(owner).updateRoundImplementation(mockImplAddress))
      .to.emit(instance, "RoundImplementationUpdated")
      .withArgs(mockImplAddress);
    
    // Verify the state variable was updated
    expect(await instance.roundImplementation()).to.equal(mockImplAddress);
  });
});