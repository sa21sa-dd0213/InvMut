import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant mbc39296b", function () {
  it("should detect mutant that replaces v1 > v2 with false in enforceTolerance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy FlashGovernanceArbiter with a mock DAO address
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiter.deploy(owner.address);
    await arbiter.waitForDeployment();
    
    // Configure security parameters - we need to bypass onlySuccessfulProposal for testing
    // Since the contract is not configured yet, onlySuccessfulProposal will pass
    await arbiter.configureSecurityParameters(50, 1000, 20); // changeTolerance = 20
    
    // End configuration to set configured = true
    await arbiter.endConfiguration();
    
    // Now we need to set enforceLimitsActive for addr1 and make addr1's contract configured
    // For testing, we can directly call setEnforcement
    await arbiter.connect(addr1).setEnforcement(true);
    
    // Now test: v1 > v2 case where original would pass but mutant would fail
    // Original: if v1 > v2, check ((v1 - v2) * 100) < changeTolerance * v1
    // Mutant: always goes to else branch, checks ((v2 - v1) * 100) < changeTolerance * v1
    
    // Use values where original passes but mutant fails
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