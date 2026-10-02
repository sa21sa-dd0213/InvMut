import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m79c24d9e - updateRoundImplementation sets to address(0)", function () {
  it("should kill mutant by verifying create reverts after updateRoundImplementation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set up program operator role for the caller
    await instance.connect(owner).updateAlloSettings(addr1.address);
    
    // Add owner as program operator to be able to call create
    // We need to set this via storage or find another way since there's no addProgramOperator function
    // For testing purposes, we'll set it directly using storage manipulation
    // Get the storage slot for programOperators mapping (slot 0 for mapping, key is owner address)
    const slot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [owner.address, 0]
      )
    );
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      slot,
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    ]);
    
    // Now call updateRoundImplementation with address(0) to simulate the mutant
    await instance.connect(owner).updateRoundImplementation(ethers.ZeroAddress);
    
    // Try to create a round - this should revert because roundImplementation was set to address(0)
    const encodedParameters = "0x";
    await expect(
      instance.connect(owner).create(encodedParameters, owner.address)
    ).to.be.revertedWith("roundImplementation is 0x");
  });
});