import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - Kill mutant m3b354dce", function () {
  it("should revert when v2 > v1 and difference exceeds changeTolerance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the FlashGovernanceArbiter with a mock DAO address
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await FlashGovernanceArbiter.deploy(owner.address);
    await instance.waitForDeployment();

    // Configure security parameters with changeTolerance = 10 (10%)
    // This requires a successful proposal, so we need to set up the DAO properly
    // For testing purposes, we'll call directly since we control the DAO
    await instance.configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      100, // epochSize
      10  // changeTolerance = 10%
    );

    // Enable enforcement for the caller
    await instance.setEnforcement(true);

    // Test case: v1 = 100, v2 = 200
    // Difference = 100, which is 100% of v1
    // With changeTolerance = 10%, this should revert
    // Original: should revert with "FE1"
    // Mutant: removed the else branch, so it will NOT revert
    
    await expect(
      instance.enforceTolerance(100, 200)
    ).to.be.revertedWith("FE1");
  });
});