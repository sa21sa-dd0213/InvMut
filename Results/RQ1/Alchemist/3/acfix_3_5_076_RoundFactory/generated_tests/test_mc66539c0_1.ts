import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant mc66539c0", function () {
  it("should revert when creating a round with roundImplementation set to address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by OwnableUpgradeable)
    await instance.initialize();
    
    // Set up a program operator
    await instance.connect(owner).updateAlloSettings(addr1.address);
    await ethers.provider.getSigner(owner).sendTransaction({
      to: instance.target,
      value: ethers.parseEther("1")
    });
    
    // Set roundImplementation to address(0) - this is what the mutant fails to check
    await instance.connect(owner).updateRoundImplementation(ethers.ZeroAddress);
    
    // Add addr1 as a program operator
    await instance.connect(owner).updateProgramOperator(addr1.address, true);
    
    // Prepare encoded parameters (can be empty bytes for this test)
    const encodedParameters = "0x";
    
    // Attempt to create a round with zero roundImplementation - should revert
    await expect(
      instance.connect(addr1).create(encodedParameters, addr1.address)
    ).to.be.reverted;
  });
});