import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - m917b588e", function () {
  it("should revert when calling updateRoundImplementation with non-zero address due to inverted zero-address check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set the caller as a program operator first (since updateRoundImplementation has onlyOwner modifier)
    // The owner is the deployer by default, so we can use owner directly
    
    // Test: calling with a non-zero address should revert in the mutant
    // because the mutant requires newRoundImplementation == address(0)
    await expect(
      instance.updateRoundImplementation(addr1.address)
    ).to.be.revertedWith("roundImplementation is 0x");
  });
});