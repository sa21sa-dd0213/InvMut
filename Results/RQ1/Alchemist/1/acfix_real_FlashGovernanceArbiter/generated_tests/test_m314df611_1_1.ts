import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m314df611 test", function () {
  it("should detect the multiplication vs exponentiation mutant in enforceTolerance", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock LimboDAOLike that returns true for successfulProposal
    const MockDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with mock DAO
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Set up the mock to return true for successfulProposal when called by owner
    await mockDAO.setSuccessfulProposal(true);
    
    // Configure security parameters with changeTolerance = 50
    await instance.connect(owner).configureSecurityParameters(
      0, // maxGovernanceChangePerEpoch (unused)
      0, // epochSize (unused)
      50 // changeTolerance = 50
    );
    
    // Enable enforcement for owner
    await instance.connect(owner).setEnforcement(true);
    
    // Now call enforceTolerance with v1=2, v2=3
    // Original: should revert because (3-2)*100 = 100 is NOT < 50*2 = 100
    // Mutant: should pass because 100 < 50**2 = 2500
    
    // Check if the call reverts (original behavior) or passes (mutant behavior)
    try {
      await instance.connect(owner).enforceTolerance(2, 3);
      // If no revert, it's the mutant (mutant killed!)
      expect(true).to.equal(false, "Mutant detected - should have reverted");
    } catch (error: any) {
      // If it reverts, it might be original or the revert message should match
      expect(error.message).to.include("FE1");
    }
    
    // Clean up mock
    await mockDAO.setSuccessfulProposal(false);
  });
});