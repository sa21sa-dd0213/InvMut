import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant kill test - m37f2a3ad", function () {
  it("should kill mutant by verifying create succeeds when alloSettings is set to non-zero address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments as it's upgradeable)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set up program operator
    await instance.connect(owner).updateProgramOperators(owner.address, true);
    
    // Deploy a mock round implementation
    const RoundImplementation = await ethers.getContractFactory("RoundImplementation");
    const roundImplementation = await RoundImplementation.deploy();
    await roundImplementation.waitForDeployment();
    
    // Set round implementation
    await instance.connect(owner).updateRoundImplementation(roundImplementation.target);
    
    // Set alloSettings to a non-zero address
    const mockAlloSettings = addr1.address;
    await instance.connect(owner).updateAlloSettings(mockAlloSettings);
    
    // Verify alloSettings is set
    expect(await instance.alloSettings()).to.equal(mockAlloSettings);
    
    // Prepare encoded parameters for round creation
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [owner.address, addr2.address, 100]
    );
    
    // Attempt to create a round - this should succeed in original but fail in mutant
    // because mutant requires alloSettings == address(0) instead of != address(0)
    const ownedBy = addr2.address;
    const tx = instance.connect(owner).create(encodedParameters, ownedBy);
    
    // The mutant will revert here because alloSettings is non-zero, but the mutant 
    // checks require(alloSettings == address(0)) which will fail
    await expect(tx).to.be.revertedWith("alloSettings is 0x");
  });
});