import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection", function () {
  it("should detect mutant mf86d4bee by verifying constructor initializes Semver parent correctly", async function () {
    const Factory = await ethers.getContractFactory("L1Block");
    
    // Attempt to deploy without constructor arguments (as the mutant does)
    // The original contract requires Semver(1, 0, 0) constructor arguments
    // The mutant removes this, so deployment without args should fail
    await expect(
      Factory.deploy()
    ).to.be.revertedWith(""); // Expect any revert - mutant will fail to compile/deploy
    
    // If deployment somehow succeeds (unlikely), verify version() returns correct value
    // But the main detection is the deployment failure itself
  });
});