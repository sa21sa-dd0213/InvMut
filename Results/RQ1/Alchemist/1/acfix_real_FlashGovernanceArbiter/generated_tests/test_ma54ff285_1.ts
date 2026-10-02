import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant detection - enforceTolerance division vs subtraction", function () {
  it("should detect mutant that replaces subtraction with division in enforceTolerance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock DAO contract that implements LimboDAOLike interface
    const MockDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy the FlashGovernanceArbiter with the mock DAO
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Configure security parameters to set changeTolerance
    // First, we need to make a successful proposal to call configureSecurityParameters
    // For testing purposes, we can directly set security parameters via the DAO mock
    
    // Set changeTolerance to 20 (meaning 20% tolerance)
    await mockDAO.setSuccessfulProposal(true);
    
    // Configure security parameters with 20% tolerance
    await instance.connect(owner).configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      100, // epochSize
      20  // changeTolerance (20%)
    );
    
    // Configure flash governance to enable enforcement
    await instance.connect(owner).configureFlashGovernance(
      await mockDAO.getAddress(), // asset
      ethers.parseEther("1"), // amount
      100, // unlockTime
      false // assetBurnable
    );
    
    // Set enforcement to active for addr1
    await instance.connect(addr1).setEnforcement(true);
    
    // Make addr1 configured via mock
    await mockDAO.setConfigured(true);
    
    // Test case: v1 = 100, v2 = 80 (20% difference, exactly at tolerance)
    // Original: (100 - 80) * 100 = 2000, changeTolerance * v1 = 20 * 100 = 2000
    // Original: 2000 < 2000 is false, so it reverts (correctly at boundary)
    // Mutant: (100 / 80) * 100 = 1 * 100 = 100 (integer division), changeTolerance * v1 = 2000
    // Mutant: 100 < 2000 is true, so it passes (incorrectly)
    
    await expect(
      instance.connect(addr1).enforceTolerance(100, 80)
    ).to.be.revertedWith("FE1");
    
    // Additional test: v1 = 100, v2 = 79 (21% difference, above tolerance)
    // Both original and mutant should revert
    await expect(
      instance.connect(addr1).enforceTolerance(100, 79)
    ).to.be.revertedWith("FE1");
    
    // Test: v1 = 100, v2 = 81 (19% difference, within tolerance)
    // Original: (100 - 81) * 100 = 1900, changeTolerance * v1 = 2000
    // Original: 1900 < 2000 is true, so it passes
    // Mutant: (100 / 81) * 100 = 1 * 100 = 100, changeTolerance * v1 = 2000
    // Mutant: 100 < 2000 is true, so it passes (both pass)
    
    await expect(
      instance.connect(addr1).enforceTolerance(100, 81)
    ).to.not.be.reverted;
  });
});

// Mock contract to simulate LimboDAOLike interface
// This would need to be deployed as a separate Solidity contract
// For brevity, the mock contract code is not included here