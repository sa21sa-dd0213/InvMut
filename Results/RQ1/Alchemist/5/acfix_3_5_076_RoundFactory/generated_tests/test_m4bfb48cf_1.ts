import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant kill test - m4bfb48cf", function () {
  it("should revert when updating roundImplementation to zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed as it's OwnableUpgradeable)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by OwnableUpgradeable)
    await instance.initialize();
    
    // Verify owner is set correctly
    expect(await instance.owner()).to.equal(owner.address);
    
    // Attempt to update roundImplementation to zero address - should revert
    await expect(
      instance.connect(owner).updateRoundImplementation(ethers.ZeroAddress)
    ).to.be.revertedWith("roundImplementation is 0x");
  });
});