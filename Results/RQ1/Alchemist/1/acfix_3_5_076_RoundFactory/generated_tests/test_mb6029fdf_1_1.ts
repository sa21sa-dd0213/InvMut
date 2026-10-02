import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - updateAlloSettings", function () {
  it("should detect mutant that sets alloSettings to address(0) instead of the provided address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments as it uses OwnableUpgradeable)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set a valid program operator (the owner)
    await instance.connect(owner).updateProgramOperators(owner.address, true);
    
    // Deploy a mock round implementation to use
    const MockRoundImpl = await ethers.getContractFactory("RoundImplementation");
    const roundImpl = await MockRoundImpl.deploy();
    await roundImpl.waitForDeployment();
    
    // Set the round implementation
    await instance.connect(owner).updateRoundImplementation(roundImpl.target);
    
    // Call updateAlloSettings with a valid non-zero address
    const validAddress = addr1.address;
    await instance.connect(owner).updateAlloSettings(validAddress);
    
    // Verify that alloSettings was actually set to the provided address (not address(0))
    const storedAlloSettings = await instance.alloSettings();
    expect(storedAlloSettings).to.equal(validAddress);
    
    // Now try to create a round - this should succeed if alloSettings is properly set
    // but fail in the mutant because alloSettings would be address(0)
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [owner.address, 100]
    );
    
    await expect(
      instance.connect(owner).create(encodedParameters, owner.address)
    ).to.not.be.reverted;
  });
});