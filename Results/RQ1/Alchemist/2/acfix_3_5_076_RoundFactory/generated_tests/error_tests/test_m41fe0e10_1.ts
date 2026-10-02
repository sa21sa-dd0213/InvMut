import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m41fe0e10 test", function () {
  it("should revert when alloSettings is zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed - uses initialize)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set a valid roundImplementation
    const mockRoundImpl = addr1.address;
    await instance.updateRoundImplementation(mockRoundImpl);
    
    // alloSettings is already address(0) by default, so we don't need to update it
    
    // Grant program operator role to caller
    await instance.connect(owner).updateProgramOperator(owner.address, true);
    
    // Create encoded parameters (minimal valid bytes)
    const encodedParams = ethers.toUtf8Bytes("test");
    
    // Attempt to call create - should revert because alloSettings is zero address
    await expect(
      instance.connect(owner).create(encodedParams, owner.address)
    ).to.be.revertedWith("alloSettings is 0x");
  });
});