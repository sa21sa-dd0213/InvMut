import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - updateAlloSettings without onlyOwner", function () {
  it("should revert when non-owner calls updateAlloSettings on original contract, but should pass on mutant (kill mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed - it uses initializer pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required before use)
    await instance.initialize();
    
    // Set up: set an alloSettings address first (needed for context, but not for this test)
    const mockAlloSettings = addr1.address;
    
    // Test: non-owner (addr1) tries to call updateAlloSettings
    // On original contract with onlyOwner modifier, this should revert
    // On mutant without onlyOwner modifier, this would succeed (killing the test)
    await expect(
      instance.connect(addr1).updateAlloSettings(mockAlloSettings)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});