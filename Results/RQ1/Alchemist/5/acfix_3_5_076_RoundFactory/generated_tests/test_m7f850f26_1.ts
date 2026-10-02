import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - m7f850f26", function () {
  it("should revert when calling initialize() twice, proving the initializer modifier is missing", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy RoundFactory - no constructor arguments needed
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First call to initialize should succeed
    await instance.initialize();
    
    // Second call to initialize should revert because of the initializer modifier
    // In the mutant, the initializer modifier is removed, so it will NOT revert
    // This test will pass on original (revert) and fail on mutant (no revert)
    await expect(
      instance.initialize()
    ).to.be.revertedWith("Initializable: contract is already initialized");
  });
});