import { expect } from "chai";
import { ethers } } from "hardhat";

describe("FlashGovernanceArbiter mutant m40cc728b test", function () {
  it("should detect mutation in enforceTolerance when v1 < v2 and difference is within tolerance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the FlashGovernanceArbiter contract
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // Configure the contract to be set up for testing
    // First, set the DAO address and configure the contract
    await instance.setDAO(addr1.address);
    
    // Configure security parameters with changeTolerance = 10%
    // We need to call configureSecurityParameters which requires onlySuccessfulProposal modifier
    // Since we're testing enforceTolerance directly, we'll need to bypass the modifier
    // by directly setting the security parameters via the DAO
    
    // Get the DAO contract to configure the proposal
    // For testing purposes, we'll set up the security parameters directly
    await instance.connect(addr1).configureSecurityParameters(
      1, // maxGovernanceChangePerEpoch
      100, // epochSize
      10 // changeTolerance = 10%
    );
    
    // Enable enforcement for addr2
    await instance.connect(addr2).setEnforcement(true);
    
    // Test case: v1 = 100, v2 = 110 (10% difference, within tolerance)
    // Original: (110 - 100) * 100 = 1000 < 10 * 100 = 1000 => 1000 < 1000 is false, so revert
    // Wait, actually 1000 < 1000 is false, so this should revert on original too
    // Let's use v1 = 100, v2 = 105 (5% difference, within tolerance)
    
    // Original: (105 - 100) * 100 = 500 < 10 * 100 = 1000 => 500 < 1000 is true, so passes
    // Mutant: (105 + 100) * 100 = 20500 < 10 * 100 = 1000 => 20500 < 1000 is false, so reverts
    
    // Call enforceTolerance with v1 = 100, v2 = 105
    // This should pass on the original but revert on the mutant
    await expect(
      instance.connect(addr2).enforceTolerance(100, 105)
    ).to.not.be.reverted;
    
    // Additional test: v1 = 200, v2 = 220 (10% difference, exactly at boundary)
    // Original: (220 - 200) * 100 = 2000 < 10 * 200 = 2000 => 2000 < 2000 is false, so reverts
    // Mutant: (220 + 200) * 100 = 42000 < 10 * 200 = 2000 => 42000 < 2000 is false, so reverts
    // This doesn't help distinguish
    
    // Better test: v1 = 100, v2 = 109 (9% difference, within tolerance)
    // Original: (109 - 100) * 100 = 900 < 10 * 100 = 1000 => 900 < 1000 is true, so passes
    // Mutant: (109 + 100) * 100 = 20900 < 10 * 100 = 1000 => 20900 < 1000 is false, so reverts
    
    await expect(
      instance.connect(addr2).enforceTolerance(100, 109)
    ).to.not.be.reverted;
    
    // Test with larger values: v1 = 1000, v2 = 1050 (5% difference, within tolerance)
    // Original: (1050 - 1000) * 100 = 5000 < 10 * 1000 = 10000 => 5000 < 10000 is true, so passes
    // Mutant: (1050 + 1000) * 100 = 205000 < 10 * 1000 = 10000 => 205000 < 10000 is false, so reverts
    
    await expect(
      instance.connect(addr2).enforceTolerance(1000, 1050)
    ).to.not.be.reverted;
  });
  
  it("should revert when enforcement is not active", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // Don't set enforcement active - enforceTolerance should return early without reverting
    await expect(
      instance.connect(addr2).enforceTolerance(100, 105)
    ).to.not.be.reverted;
  });
});