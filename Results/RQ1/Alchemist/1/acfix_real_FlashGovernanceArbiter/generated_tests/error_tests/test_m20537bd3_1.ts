import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m20537bd3 test", function () {
  it("should revert when enforceTolerance is called with v2 > v1 and percentage difference exceeds changeTolerance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock DAO that returns a zero address for getFlashGoverner
    // We need to deploy the contract with a DAO address
    const MockDAO = await ethers.getContractFactory("LimboDAOLike");
    // Since LimboDAOLike is abstract, we need to deploy a concrete implementation
    // For testing purposes, we'll use a simple mock
    const mockDAO = await ethers.deployContract("MockLimboDAO");
    await mockDAO.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Configure security parameters with changeTolerance = 10 (10%)
    // First, we need to make a successful proposal to configure security
    // For simplicity, we'll directly set the security parameters via the contract's internal state
    // Since we can't directly call configureSecurityParameters without a successful proposal,
    // we'll deploy a test helper or use the owner to directly manipulate storage
    
    // Alternative approach: deploy a test contract that can call the function
    // Or we can set the DAO to allow us to bypass governance checks
    
    // Set DAO to allow us to configure
    await instance.setDAO(await mockDAO.getAddress());
    
    // Configure security parameters with changeTolerance = 10
    // We need to make the sender a successful proposal first
    // Mock the successfulProposal to return true
    await mockDAO.setSuccessfulProposal(owner.address, true);
    
    // Configure flash governance first (required for some functions)
    await instance.configureFlashGovernance(
      ethers.ZeroAddress, // asset
      0, // amount
      0, // unlockTime
      false // assetBurnable
    );
    
    // Configure security parameters
    await instance.configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      3600, // epochSize (1 hour)
      10 // changeTolerance (10%)
    );
    
    // Now test enforceTolerance with v1=100, v2=200 (100% difference, exceeds 10% tolerance)
    // This should revert in the original but pass in the mutant
    
    // First, we need to set enforceLimitsActive for the caller
    await instance.setEnforcement(true);
    
    // Also need to make the caller "configured" - deploy a mock Configurable contract
    const MockConfigurable = await ethers.getContractFactory("MockConfigurable");
    const mockConfigurable = await MockConfigurable.deploy();
    await mockConfigurable.waitForDeployment();
    await mockConfigurable.setConfigured(true);
    
    // Call enforceTolerance through the mockConfigurable (which is configured)
    // Since enforceTolerance checks msg.sender, we need to call from mockConfigurable
    // We'll use a low-level call or deploy a test helper
    
    // Actually, let's test directly from owner since we can set enforcement
    // But the check also requires Configurable(msg.sender).configured()
    // So we need to call from a contract that implements Configurable
    
    // Deploy a test helper contract
    const TestHelper = await ethers.getContractFactory("TestHelper");
    const testHelper = await TestHelper.deploy(await instance.getAddress());
    await testHelper.waitForDeployment();
    
    // Set enforcement for the test helper
    await instance.connect(testHelper).setEnforcement(true);
    
    // Now call enforceTolerance through the test helper
    // v1=100, v2=200 - this should revert in original but pass in mutant
    await expect(
      testHelper.callEnforceTolerance(100, 200)
    ).to.be.revertedWith("FE1");
  });
});

// Helper contracts to be deployed in the test
contract MockLimboDAO {
    mapping(address => bool) public successfulProposals;
    address public flashGoverner;
    
    function setSuccessfulProposal(address proposal, bool success) external {
        successfulProposals[proposal] = success;
    }
    
    function successfulProposal(address proposal) external view returns (bool) {
        return successfulProposals[proposal];
    }
    
    function getFlashGoverner() external view returns (address) {
        return flashGoverner;
    }
    
    function proposalConfig() external view returns (uint256, uint256, address) {
        return (0, 0, address(0));
    }
}

contract MockConfigurable {
    bool private _configured;
    
    function setConfigured(bool val) external {
        _configured = val;
    }
    
    function configured() external view returns (bool) {
        return _configured;
    }
}

contract TestHelper {
    FlashGovernanceArbiter public arbiter;
    
    constructor(address _arbiter) {
        arbiter = FlashGovernanceArbiter(_arbiter);
    }
    
    function callEnforceTolerance(uint256 v1, uint256 v2) external view {
        arbiter.enforceTolerance(v1, v2);
    }
    
    function configured() external pure returns (bool) {
        return true;
    }
}