import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - onlyProgramOperator modifier", function () {
  it("should revert when calling create from an address that is not a program operator", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory - it's an upgradeable contract, no constructor arguments
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set up required addresses for create function
    // Deploy a minimal mock for roundImplementation (any contract with address)
    const MockImplementation = await ethers.getContractFactory("RoundImplementation");
    const mockImpl = await MockImplementation.deploy();
    await mockImpl.waitForDeployment();
    
    // Set roundImplementation and alloSettings via owner
    await instance.connect(owner).updateRoundImplementation(mockImpl.target);
    
    // Set alloSettings to a valid address (can be any address)
    await instance.connect(owner).updateAlloSettings(addr1.target);
    
    // Prepare encoded parameters (empty bytes)
    const encodedParams = "0x";
    
    // Attempt to call create from addr1 who is NOT a program operator
    // The original contract should revert because addr1 is not authorized
    // The mutant would not revert, thus failing the test
    await expect(
      instance.connect(addr1).create(encodedParams, addr2.target)
    ).to.be.revertedWith("Caller is not a program operator");
  });
});