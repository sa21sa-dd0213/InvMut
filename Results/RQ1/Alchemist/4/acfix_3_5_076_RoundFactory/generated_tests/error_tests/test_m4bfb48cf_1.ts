import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m4bfb48cf - updateRoundImplementation zero address validation", function () {
  it("should revert when updating round implementation to zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory - no constructor arguments needed
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Add owner as program operator to be able to call create later if needed
    // (not strictly required for this test but good practice)
    
    // Attempt to update round implementation to zero address - should revert
    await expect(
      instance.connect(owner).updateRoundImplementation(ethers.ZeroAddress)
    ).to.be.revertedWith("roundImplementation is 0x");
  });
});