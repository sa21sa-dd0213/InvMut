import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - m4bfb48cf", function () {
  it("should revert when updating round implementation to zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed - uses initializer)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set the caller as a program operator to satisfy the modifier
    await instance.connect(owner).updateAlloSettings(owner.address);
    
    // Attempt to update round implementation to zero address
    // Original contract should revert due to require check
    // Mutant would allow this to proceed without revert
    await expect(
      instance.connect(owner).updateRoundImplementation(ethers.ZeroAddress)
    ).to.be.revertedWith("roundImplementation is 0x");
  });
});