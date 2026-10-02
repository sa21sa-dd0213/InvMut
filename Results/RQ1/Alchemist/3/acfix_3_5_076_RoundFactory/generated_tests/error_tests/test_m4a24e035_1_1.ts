import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - m4a24e035", function () {
  it("should revert when non-owner calls updateRoundImplementation (mutant removes onlyOwner)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed - it uses initializer pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required before use)
    await instance.initialize();
    
    // Try to call updateRoundImplementation from a non-owner address
    await expect(
      instance.connect(addr1).updateRoundImplementation(addr1.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});