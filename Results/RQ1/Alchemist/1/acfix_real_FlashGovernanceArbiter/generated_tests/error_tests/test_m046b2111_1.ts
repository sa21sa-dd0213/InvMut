import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m046b2111 test", function () {
  it("should kill mutant by calling enforceToleranceInt with negative v2", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock DAO that returns a flash governor address
    const MockDAOFactory = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAOFactory.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Configure security parameters to set changeTolerance
    // First we need to make the deployer a successful proposal to call configureSecurityParameters
    // For simplicity, we'll directly test the enforceToleranceInt function behavior
    
    // Set up enforcement for addr1
    await instance.connect(addr1).setEnforcement(true);
    
    // Call enforceToleranceInt with v1=10 and v2=-5 (negative value)
    // Original: -1 * (-5) = 5, so it computes enforceTolerance(10, 5)
    // Mutant: -1 + (-5) = -6, which when cast to uint256 becomes a huge number
    // This should revert in the mutant due to arithmetic underflow or different behavior
    
    // In the original, this should pass if configured() returns false (which it does by default)
    // In the mutant, this should revert due to incorrect absolute value computation
    await expect(
      instance.connect(addr1).enforceToleranceInt(10, -5)
    ).to.be.reverted; // Mutant should revert, original should pass
    
    // Also test with positive v2 to ensure it still works correctly
    await expect(
      instance.connect(addr1).enforceToleranceInt(10, 5)
    ).to.not.be.reverted;
  });
});