import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - updateRoundImplementation zero address check", function () {
  it("should revert when updating roundImplementation to zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed as per contract)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by Initializable pattern)
    await instance.initialize();
    
    // Set the caller as a program operator to satisfy onlyProgramOperator modifier
    // Note: The onlyProgramOperator modifier checks programOperators mapping
    await instance.connect(owner).updateAlloSettings(addr1.address);
    
    // Attempt to update roundImplementation to zero address - should revert
    // The original contract has require(newRoundImplementation != address(0), "roundImplementation is 0x")
    // The mutant removes this check, so it would NOT revert
    await expect(
      instance.connect(owner).updateRoundImplementation(ethers.ZeroAddress)
    ).to.be.revertedWith("roundImplementation is 0x");
  });
});