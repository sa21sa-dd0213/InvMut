import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - m664098ee", function () {
  it("should kill the mutant by verifying roundImplementation is set to the provided address, not address(this)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock contract to use as the new round implementation
    const MockImplementation = await ethers.getContractFactory("RoundFactory");
    const mockImplementation = await MockImplementation.deploy();
    await mockImplementation.waitForDeployment();
    const mockAddress = await mockImplementation.getAddress();
    
    // Deploy the RoundFactory (original constructor has no arguments)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    
    // Initialize the factory (required by OwnableUpgradeable)
    await factory.initialize();
    
    // Add owner as program operator to satisfy onlyProgramOperator modifier
    await factory.connect(owner).updateProgramOperators(owner.address, true);
    
    // Call updateRoundImplementation with the mock address
    await factory.connect(owner).updateRoundImplementation(mockAddress);
    
    // Read the stored roundImplementation
    const storedImplementation = await factory.roundImplementation();
    
    // The mutant would set roundImplementation to address(this), so:
    // - In the original: storedImplementation should equal mockAddress
    // - In the mutant: storedImplementation would equal factoryAddress
    // We assert it equals the provided address to kill the mutant
    expect(storedImplementation).to.equal(mockAddress);
    expect(storedImplementation).to.not.equal(factoryAddress);
  });
});