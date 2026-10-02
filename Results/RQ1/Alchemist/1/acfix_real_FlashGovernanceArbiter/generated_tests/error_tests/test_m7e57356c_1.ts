import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant detection - enforceTolerance", function () {
  it("should kill mutant m7e57356c by detecting inverted tolerance check when v1 > v2 and v2 != 0", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with a DAO address (can be any address for testing)
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();

    // Configure security parameters with changeTolerance = 10 (10%)
    // Need to call configureSecurityParameters through a successful proposal
    // For testing purposes, we can directly set the security parameters by calling the function
    // but we need to bypass the onlySuccessfulProposal modifier by calling via a proposal
    // Since we're testing the enforceTolerance function directly, we can set security params
    // by calling the internal function or using a test helper
    
    // First, let's set up the security parameters directly
    // We'll use owner as the sender and set the DAO to allow direct calls
    // Actually, we need to set DAO to owner so we can call configureSecurityParameters
    // But configureSecurityParameters has onlySuccessfulProposal modifier
    
    // For testing enforceTolerance, we need to:
    // 1. Set security.changeTolerance to a known value
    // 2. Set enforceLimitsActive for the caller
    // 3. Make the caller "configured" by deploying a configurable contract
    
    // Deploy a simple configurable contract that returns configured() = true
    const ConfigurableFactory = await ethers.getContractFactory("SimpleConfigurable");
    const configurable = await ConfigurableFactory.deploy();
    await configurable.waitForDeployment();
    
    // Set enforceLimitsActive for the configurable contract
    await instance.setEnforcement(true);
    
    // Now we need to set security parameters
    // Since configureSecurityParameters has onlySuccessfulProposal modifier,
    // we need to bypass it by setting the storage directly or using a proposal
    // For this test, we'll use a workaround: set the DAO to owner and then
    // make a successful proposal call
    
    // Actually, let's use a different approach - we can set the security params
    // by calling setDAO first to make owner the DAO, then call configureSecurityParameters
    await instance.setDAO(owner.address);
    
    // Now owner can call configureSecurityParameters since it's the DAO
    // Wait - configureSecurityParameters has onlySuccessfulProposal modifier
    // which requires assertSuccessfulProposal to pass
    // Since configured is false initially, assertSuccessfulProposal will pass
    await instance.configureSecurityParameters(
      10,    // maxGovernanceChangePerEpoch
      100,   // epochSize
      10     // changeTolerance = 10%
    );
    
    // Now test the enforceTolerance function
    // Case: v1 = 200, v2 = 190 (v1 > v2, v2 != 0)
    // Difference = 10, (v1 - v2) * 100 = 1000
    // changeTolerance * v1 = 10 * 200 = 2000
    // Original: 1000 < 2000 -> true (should pass)
    // Mutant: 1000 > 2000 -> false (should revert with "FE1")
    
    // Call enforceTolerance from the configurable contract
    // Since enforceTolerance is a view function, we need to call it as a transaction
    // to catch reverts, or use staticCall
    
    // The configurable contract needs to call enforceTolerance
    // We'll create a helper contract that calls enforceTolerance
    const HelperFactory = await ethers.getContractFactory("EnforceToleranceHelper");
    const helper = await HelperFactory.deploy();
    await helper.waitForDeployment();
    
    // Call enforceTolerance through the helper
    // This should pass on original but fail on mutant
    await expect(
      helper.callEnforceTolerance(instance.target, 200, 190)
    ).to.not.be.reverted;
    
    // Also test the opposite case to ensure the mutant is killed
    // Case where difference is greater than tolerance
    // v1 = 200, v2 = 150 (difference = 50)
    // (v1 - v2) * 100 = 5000
    // changeTolerance * v1 = 2000
    // Original: 5000 < 2000 -> false (should revert with "FE1")
    // Mutant: 5000 > 2000 -> true (should pass)
    
    await expect(
      helper.callEnforceTolerance(instance.target, 200, 150)
    ).to.be.revertedWith("FE1");
  });
});

// Helper contracts to enable testing
contract SimpleConfigurable {
    function configured() public view returns (bool) {
        return true;
    }
}

contract EnforceToleranceHelper {
    function callEnforceTolerance(address arbiter, uint256 v1, uint256 v2) external view {
        FlashGovernanceArbiter(arbiter).enforceTolerance(v1, v2);
    }
}

interface FlashGovernanceArbiter {
    function enforceTolerance(uint256 v1, uint256 v2) external view;
}