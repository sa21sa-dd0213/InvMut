import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - m4a24e035", function () {
  it("should revert when non-owner calls updateRoundImplementation", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required before use)
    await instance.connect(owner).initialize();
    
    // Set a valid round implementation address first (owner can do this)
    const dummyAddress = "0x0000000000000000000000000000000000000001";
    await instance.connect(owner).updateRoundImplementation(dummyAddress);
    
    // Non-owner should not be able to call updateRoundImplementation
    await expect(
      instance.connect(nonOwner).updateRoundImplementation(dummyAddress)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});