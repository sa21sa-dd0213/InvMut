import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test - enforceTolerance", function () {
  it("should kill mutant mc4740269 by calling enforceTolerance with v1 > 0 and v2 > v1, expecting revert with 'FE1' on mutant but not on original", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with a mock DAO address (can be any address since we'll configure directly)
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await FlashGovernanceArbiter.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Set configured to true by calling endConfiguration (inherited from Governable)
    await instance.endConfiguration();
    
    // Configure security parameters to set changeTolerance to a value (e.g., 50)
    // First we need to be a successful proposal - since we're owner and DAO, we can set this up
    // For testing, we'll directly manipulate state by calling configureSecurityParameters
    // Note: This requires onlySuccessfulProposal modifier, so we need to make owner a successful proposal
    // We can bypass by directly calling through the DAO (owner is DAO)
    
    // Set security.changeTolerance to 50%
    await instance.configureSecurityParameters(10, 100, 50);
    
    // Enable enforcement for addr1 by calling setEnforcement
    await instance.connect(addr1).setEnforcement(true);
    
    // Now call enforceTolerance with v1=10, v2=20 (v1 > 0 and v2 > v1)
    // Original: v1=10, v2=20 -> goes to else branch, v1 != 0 so checks ((20-10)*100 < 50*10) => (1000 < 500) => false => revert with "FE1"
    // Mutant: v1=10, v2=20 -> goes to else branch, true so checks require(v2 <= 1) => 20 <= 1 => false => revert with "FE1"
    // Both revert but for different reasons - test passes on both
    
    // Let's use values where original passes but mutant fails:
    // Original: v1=10, v2=15 -> else branch, v1 != 0, check ((15-10)*100 < 50*10) => (500 < 500) => false => revert with "FE1"
    // Mutant: v1=10, v2=15 -> else branch, true, check require(v2 <= 1) => 15 <= 1 => false => revert with "FE1"
    // Both still revert...
    
    // Try: v1=10, v2=11 -> original: (1*100 < 50*10) => (100 < 500) => true => passes
    // Mutant: true => require(11 <= 1) => false => revert
    // This should kill the mutant!
    
    await expect(
      instance.connect(addr1).enforceTolerance(10, 11)
    ).to.be.revertedWith("FE1");
    
    // The original would pass this call, but the mutant reverts
  });
});