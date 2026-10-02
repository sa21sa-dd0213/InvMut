import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - Kill mutant mc1a714a3", function () {
  it("should revert enforceTolerance with v1=1 and v2=0 on mutant (v1 < 1) but pass on original (v1 <= 1)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock DAO contract that returns a zero address for getFlashGoverner
    const MockDaoFactory = await ethers.getContractFactory("MockLimboDAO");
    const mockDao = await MockDaoFactory.deploy();
    await mockDao.waitForDeployment();
    
    // Deploy a mock Configurable contract that returns configured=true
    const MockConfigurableFactory = await ethers.getContractFactory("MockConfigurable");
    const mockConfigurable = await MockConfigurableFactory.deploy();
    await mockConfigurable.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with the mock DAO address
    const FlashGovernanceArbiterFactory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await FlashGovernanceArbiterFactory.deploy(await mockDao.getAddress());
    await instance.waitForDeployment();
    
    // Set DAO to owner so we can call setDAO and endConfiguration
    await instance.setDAO(owner.address);
    
    // Configure the contract as configured
    await instance.endConfiguration();
    
    // Enable enforcement for the mock configurable address
    await instance.setEnforcement(true);
    
    // Configure security parameters to set changeTolerance (needed for the require check)
    // First we need to make a successful proposal - we'll bypass by setting DAO directly
    // Actually we need to call configureSecurityParameters which requires onlySuccessfulProposal
    // For testing purposes, we'll use the mock DAO that returns true for successfulProposal
    // Let's deploy a proper mock that makes the owner a successful proposer
    
    // Re-deploy with proper setup
    const MockDaoWithSuccessFactory = await ethers.getContractFactory("MockLimboDAOWithSuccess");
    const mockDaoWithSuccess = await MockDaoWithSuccessFactory.deploy();
    await mockDaoWithSuccess.waitForDeployment();
    
    const instance2 = await FlashGovernanceArbiterFactory.deploy(await mockDaoWithSuccess.getAddress());
    await instance2.waitForDeployment();
    
    // Call endConfiguration to set configured = true
    await instance2.endConfiguration();
    
    // Enable enforcement for the mock configurable
    await instance2.setEnforcement(true);
    
    // Now configure security parameters with changeTolerance = 50
    await instance2.configureSecurityParameters(10, 100, 50);
    
    // Call enforceTolerance with v1=1, v2=0
    // On original: require(v1 <= 1, "FE1") -> 1 <= 1 is true -> passes
    // On mutant: require(v1 < 1, "FE1") -> 1 < 1 is false -> reverts with "FE1"
    await expect(
      instance2.enforceTolerance(1, 0)
    ).to.be.revertedWith("FE1");
  });
});

// Helper mock contracts for deployment
// Note: These would need to be deployed as separate Solidity contracts or inlined
// For brevity, this test assumes they exist in the project