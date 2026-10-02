import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection test", function () {
  it("should revert when non-program-operator calls create function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.connect(owner).initialize();
    
    // Set up a round implementation address and alloSettings
    const mockImplementation = addr1.address;
    const mockAlloSettings = owner.address;
    
    // Update round implementation and alloSettings
    await instance.connect(owner).updateRoundImplementation(mockImplementation);
    await instance.connect(owner).updateAlloSettings(mockAlloSettings);
    
    // Try to call create from a non-program-operator address
    const encodedParams = "0x";
    
    // This should revert because addr1 is not a program operator
    await expect(
      instance.connect(addr1).create(encodedParams, addr1.address)
    ).to.be.revertedWith("Caller is not a program operator");
  });
});