import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant detection - enforceTolerance arithmetic change", function () {
  it("should detect mutant that changes * to + in enforceTolerance function", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock DAO contract that implements LimboDAOLike interface
    const MockDAOFactory = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAOFactory.deploy();
    await mockDAO.waitForDeployment();

    // Deploy the FlashGovernanceArbiter with the mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();

    // Deploy a mock Configurable contract for testing enforceTolerance
    const MockConfigurableFactory = await ethers.getContractFactory("MockConfigurable");
    const mockConfigurable = await MockConfigurableFactory.deploy();
    await mockConfigurable.waitForDeployment();

    // Configure security parameters to set changeTolerance
    // First we need to make a successful proposal to call configureSecurityParameters
    // For testing, we'll directly set the security parameters by calling the internal storage
    // Actually, let's use the mockDAO to simulate a successful proposal
    await mockDAO.setSuccessfulProposal(owner.address, true);

    // Configure security parameters with changeTolerance = 10 (10%)
    await instance.connect(owner).configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      86400, // epochSize (1 day)
      10 // changeTolerance = 10%
    );

    // Enable enforcement for the mock configurable contract
    await instance.connect(addr1).setEnforcement(true);

    // Configure the mock configurable to return configured = true
    await mockConfigurable.setConfigured(true);

    // Test case that will detect the mutant:
    // v1 = 100, v2 = 95 (5% difference)
    // Original: ((100-95) * 100) < 10 * 95 => (5 * 100) < 950 => 500 < 950 => true (passes)
    // Mutant: ((100-95) * 100) < 10 + 95 => (5 * 100) < 105 => 500 < 105 => false (reverts)

    // The original should pass, mutant should revert
    await expect(
      instance.connect(mockConfigurable).enforceTolerance(100, 95)
    ).to.not.be.reverted;

    // Additional test: v1 = 95, v2 = 100 (same 5% difference but reversed)
    // Original: ((100-95) * 100) < 10 * 95 => 500 < 950 => true (passes)
    // Mutant: ((100-95) * 100) < 10 + 95 => 500 < 105 => false (reverts)
    await expect(
      instance.connect(mockConfigurable).enforceTolerance(95, 100)
    ).to.not.be.reverted;
  });
});

// Helper contracts for testing
contract MockLimboDAO {
  mapping(address => bool) public successfulProposals;
  address public flashGoverner;

  function setSuccessfulProposal(address proposer, bool success) external {
    successfulProposals[proposer] = success;
  }

  function successfulProposal(address proposer) external view returns (bool) {
    return successfulProposals[proposer];
  }

  function getFlashGoverner() external view returns (address) {
    return flashGoverner;
  }

  function proposalConfig() external pure returns (uint256, uint256, address) {
    return (0, 0, address(0));
  }
}

contract MockConfigurable {
  bool public isConfigured;

  function setConfigured(bool _configured) external {
    isConfigured = _configured;
  }

  function configured() external view returns (bool) {
    return isConfigured;
  }
}