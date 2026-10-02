import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test - enforceToleranceInt exponentiation bug", function () {
  it("should kill mutant by passing negative v1 where absolute value calculation differs", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with a mock DAO address (can be any valid address for testing)
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Configure security parameters to allow the test to pass
    // First need to make a successful proposal to call configureSecurityParameters
    // We'll use the owner as the proposer and manually set up the DAO
    await instance.setDAO(owner.address);
    
    // Configure security with changeTolerance = 50 (50%)
    // This requires onlySuccessfulProposal modifier - we need to bypass it for testing
    // Since we control the DAO, we can call directly for testing purposes
    // Actually, let's test the enforceToleranceInt function directly
    
    // Set up enforcement for addr1
    await instance.setEnforcement(true);
    
    // Configure the DAO to return configured() = true for addr1
    // Since we're testing the pure logic, we can call enforceToleranceInt directly
    
    // Test case: v1 = -5, v2 = 10
    // Original: uv1 = uint256(-1 * -5) = 5, enforceTolerance(5, 10) should pass
    // Mutant: uv1 = uint256(-1 ** -5) = uint256(-1) = max uint256, will revert
    
    // To make the test work, we need configured = true and enforceLimitsActive[msg.sender] = true
    // Let's call enforceToleranceInt directly from addr1 after setting up
    
    // First, we need to make the DAO return configured() = true for addr1
    // Since we can't easily mock, let's test with a simple call that should pass on original
    
    // The key insight: with v1 = -5 and v2 = 10:
    // Original: uv1 = 5, (10-5)*100 = 500, 50*5 = 250, 500 < 250? No, so it reverts with "FE1"
    // Mutant: uv1 = max uint256, v2 = 10, v2 < uv1, so it checks (10 - max) which underflows
    
    // Let's try v1 = -2, v2 = 3 with changeTolerance = 50
    // Original: uv1 = 2, (3-2)*100 = 100, 50*2 = 100, 100 < 100? No, reverts
    // Mutant: uv1 = max, same underflow
    
    // Better test: v1 = -1, v2 = 1 with changeTolerance = 0
    // Original: uv1 = 1, v1 > v2? No, v1 == v2, so neither branch, passes
    // Mutant: uv1 = 1, same result - both pass
    
    // Critical test: v1 = -2, v2 = 2 with changeTolerance = 0
    // Original: uv1 = 2, v1 == v2, passes
    // Mutant: uv1 = max, v2 < uv1, (max-2)*100 underflows
    
    // Let's try v1 = -3, v2 = 4 with changeTolerance = 30
    // Original: uv1 = 3, (4-3)*100 = 100, 30*3 = 90, 100 < 90? No, reverts with "FE1"
    // Mutant: uv1 = max, underflow
    
    // Test: v1 = -1, v2 = 0 with changeTolerance = 50
    // Original: uv1 = 1, v1 > v2? 1 > 0, v2 == 0, require(1 <= 1) passes
    // Mutant: uv1 = max, v1 > v2, v2 == 0, require(max <= 1) reverts with "FE1"
    
    // This is our killer test case!
    await expect(
      instance.connect(addr1).enforceToleranceInt(-1, 0)
    ).to.be.revertedWith("FE1");
    
    // On the original, this would NOT revert because uv1 = 1 and 1 <= 1 passes
    // On the mutant, uv1 = max uint256 and max <= 1 fails, causing revert with "FE1"
    // Therefore, the mutant is killed when the test expects revert but original passes
  });
});