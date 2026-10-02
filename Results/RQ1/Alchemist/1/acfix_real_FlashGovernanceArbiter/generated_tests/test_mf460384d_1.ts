import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant mf460384d", function () {
  it("should revert when v1 > v2 and tolerance is within bounds, but mutant incorrectly uses wrong branch", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock DAO that satisfies the constructor requirement
    const MockDAOLike = await ethers.getContractFactory("LimboDAOLike");
    const mockDAO = await MockDAOLike.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with mock DAO
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Set up the contract to be configured and enforce limits
    await instance.setDAO(await owner.getAddress());
    await instance.endConfiguration();
    await instance.setEnforcement(true);
    
    // Deploy a mock configurable contract that returns configured = true
    const MockConfigurable = await ethers.getContractFactory("Configurable");
    const mockConfig = await MockConfigurable.deploy();
    await mockConfig.waitForDeployment();
    
    // Configure security parameters with a tolerance of 10%
    // We need to call configureSecurityParameters which requires onlySuccessfulProposal
    // First, make the owner a successful proposal
    // Since we're testing the enforceTolerance function directly, we need to simulate the state
    // Let's directly set the security parameters via the public variable (if possible) or use the setter
    
    // Alternative approach: directly call enforceTolerance as the mock configurable contract
    // Set up the security parameters by calling configureSecurityParameters
    // For this, we need the owner to be recognized as a successful proposal
    // We'll use the fact that assertSuccessfulProposal allows when configured is false initially
    
    // Set security parameters
    await instance.configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      100, // epochSize
      10 // changeTolerance (10%)
    );
    
    // Now call enforceTolerance from the mock configurable contract
    // v1 = 100, v2 = 95 (v1 > v2, difference is 5%)
    // With tolerance 10%, (100-95)*100 = 500, 10*100 = 1000, 500 < 1000 => should pass
    // The original would go to v1 > v2 branch: ((100-95)*100) < 10*100 => 500 < 1000 => true, no revert
    // The mutant would go to else branch: ((95-100)*100) < 10*100 => (-500) underflow revert
    
    await expect(
      instance.connect(mockConfig).enforceTolerance(100, 95)
    ).to.not.be.reverted; // Original passes, mutant reverts due to underflow
    
    // Additional test: v1 = 95, v2 = 100 (v1 < v2) - both original and mutant should behave same
    await expect(
      instance.connect(mockConfig).enforceTolerance(95, 100)
    ).to.not.be.reverted;
  });
});