import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - Kill mutant m7b23c3ef (enforceTolerance)", function () {
  it("should revert when enforceTolerance is called with v1=0 and v2=2 on original, but mutant removes the else branch check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with a mock DAO address (we need a valid address for constructor)
    const mockDAO = addr1.address;
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(mockDAO);
    await instance.waitForDeployment();
    
    // Set enforceLimitsActive for addr1 to true
    await instance.connect(addr1).setEnforcement(true);
    
    // Configure security parameters to set changeTolerance (required for the check)
    // First we need to make addr1 a successful proposal to call configureSecurityParameters
    // For testing, we'll set up the DAO mock behavior
    // Since we can't easily mock, let's test the revert path directly
    
    // The mutant removes the else branch entirely, so when v2 >= v1 and v1 != 0,
    // or when v1 == 0 and v2 > 1, the original reverts but mutant doesn't
    // Test case: v1 = 0, v2 = 2 should revert in original with "FE1"
    
    // We need to call enforceTolerance through a contract that has configured() return true
    // Let's deploy a simple test contract that implements Configurable
    const TestConfigurable = await ethers.getContractFactory(
      "contract TestConfigurable { bool public configured; function setConfigured(bool _c) public { configured = _c; } }"
    );
    const testConfig = await TestConfigurable.deploy();
    await testConfig.waitForDeployment();
    
    // Set configured to true
    await testConfig.setConfigured(true);
    
    // Call enforceTolerance with v1=0, v2=2 through the testConfig contract
    // The original should revert because v1==0 and v2>1 triggers "FE1"
    // The mutant removes this check entirely, so it should NOT revert
    try {
      // Use addr1 as sender but call through testConfig to satisfy the configured() check
      await instance.connect(addr1).enforceTolerance(0, 2);
      // If we reach here, the mutant has been killed (no revert when there should be one)
      expect.fail("Expected revert not thrown - mutant detected!");
    } catch (error: any) {
      // In original, we expect revert with "FE1"
      // In mutant, we don't get a revert
      expect(error.message).to.include("FE1");
    }
  });
});