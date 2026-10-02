import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m6c00c4c4 test", function () {
  it("should kill mutant that inverts roundImplementation zero address check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed - uses initialize pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set a non-zero roundImplementation (any valid address)
    const mockImplementation = addr1.address;
    await instance.updateRoundImplementation(mockImplementation);
    
    // Set alloSettings to non-zero to pass the second require
    await instance.updateAlloSettings(owner.address);
    
    // Add owner as program operator
    await instance.programOperators(owner.address, true);
    
    // Create encoded parameters (empty bytes for simplicity)
    const encodedParams = "0x";
    
    // Call create - this should succeed on original but fail on mutant
    // because mutant requires roundImplementation == address(0) which is false
    await expect(
      instance.create(encodedParams, addr1.address)
    ).to.not.be.reverted;
    
    // Verify that a clone was actually created
    const cloneAddress = await instance.create.staticCall(encodedParams, addr1.address);
    expect(cloneAddress).to.not.equal(ethers.ZeroAddress);
  });
});