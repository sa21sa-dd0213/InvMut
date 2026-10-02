import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant mbc39296b", function () {
  it("should detect mutant that replaces v1 > v2 with false in enforceTolerance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy FlashGovernanceArbiter with a mock DAO address
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiter.deploy(owner.address);
    await arbiter.waitForDeployment();

    // Configure security parameters to set changeTolerance
    // We need to make the contract configured first by calling setDAO and endConfiguration
    // Since we're the DAO, we can call setDAO to keep it as owner
    // Then endConfiguration to set configured = true
    
    // First, we need to make the test work - configure security parameters via onlySuccessfulProposal
    // Since we need to test enforceTolerance directly, we can call it without proposal check
    // by setting up the state properly
    
    // Configure security parameters - we need to bypass onlySuccessfulProposal for testing
    // Let's directly set security parameters by calling the function as owner
    // Since the contract is not configured yet, onlySuccessfulProposal will pass
    
    await arbiter.configureSecurityParameters(50, 1000, 20); // changeTolerance = 20
    
    // Now we need to set enforceLimitsActive for addr1 and make addr1's contract configured
    // For testing, we can directly call setEnforcement
    await arbiter.connect(addr1).setEnforcement(true);
    
    // Now test: v1 > v2 case where original would pass but mutant would fail
    // Original: if v1 > v2, check ((v1 - v2) * 100) < changeTolerance * v1
    // Mutant: always goes to else branch, checks ((v2 - v1) * 100) < changeTolerance * v1
    
    // Set v1 = 200, v2 = 100 (v1 > v2)
    // Original check: ((200-100)*100) < 20*200 => 10000 < 4000 => false (would revert)
    // Mutant check: ((100-200)*100) < 20*200 => underflow! Actually (v2 - v1) with v2 < v1 gives negative
    // Wait, let's reconsider...
    
    // Actually we need a case where original would NOT revert but mutant would
    // Original (v1 > v2): ((v1 - v2) * 100) < changeTolerance * v1
    // Mutant (always else): ((v2 - v1) * 100) < changeTolerance * v1  (but v2 - v1 is negative, so it wraps)
    
    // Better approach: use v1 = 100, v2 = 80 (v1 > v2)
    // Original check: ((100-80)*100) < 20*100 => 2000 < 2000 => false (would revert)
    // Mutant check: ((80-100)*100) < 20*100 => underflow in unsigned math
    
    // Let's use values where original passes but mutant fails
    // v1 = 100, v2 = 90 (v1 > v2)
    // Original: ((100-90)*100) < 20*100 => 1000 < 2000 => true (passes)
    // Mutant: ((90-100)*100) < 20*100 => underflow revert
    
    // This should work - original passes, mutant reverts
    await expect(
      arbiter.connect(addr1).enforceTolerance(100, 90)
    ).to.not.be.reverted;
    
    // The mutant would revert due to underflow, killing the mutant
  });
});