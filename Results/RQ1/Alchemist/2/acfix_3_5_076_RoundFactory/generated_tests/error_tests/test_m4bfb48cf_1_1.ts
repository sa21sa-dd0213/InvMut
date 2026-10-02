import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m4bfb48cf - zero address validation", function () {
  it("should revert when updateRoundImplementation is called with zero address", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed as per contract)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Call updateRoundImplementation with zero address - should revert
    await expect(
      instance.connect(owner).updateRoundImplementation(ethers.ZeroAddress)
    ).to.be.revertedWith("roundImplementation is 0x");
  });
});