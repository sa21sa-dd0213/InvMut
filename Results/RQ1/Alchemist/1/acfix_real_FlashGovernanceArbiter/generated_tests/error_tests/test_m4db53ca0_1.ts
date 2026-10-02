import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant detection test", function () {
  it("should revert when enforceTolerance is called with v1 > v2 and v2 != 0 and tolerance is exceeded (mutant removes check)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock DAO that returns necessary values
    const MockLimboDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockLimboDAO.deploy();
    await mockDAO.waitForDeployment();

    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();

    // Configure security parameters to set changeTolerance
    // First, we need to make the caller a successful proposal
    await mockDAO.setSuccessfulProposal(owner.address, true);
    
    // Configure security with changeTolerance = 10 (10%)
    await instance.connect(owner).configureSecurityParameters(
      1,   // maxGovernanceChangePerEpoch (unused in enforceTolerance)
      100, // epochSize (unused in enforceTolerance)
      10   // changeTolerance = 10%
    );

    // Configure the caller as a governed contract that is configured
    const MockConfigurable = await ethers.getContractFactory("MockConfigurable");
    const mockConfigurable = await MockConfigurable.deploy();
    await mockConfigurable.waitForDeployment();
    await mockConfigurable.setConfigured(true);

    // Enable enforcement for the mock configurable
    await instance.connect(owner).setEnforcement(true);
    
    // Call enforceTolerance from the mock configurable's address
    // v1 = 200, v2 = 100, difference = 100
    // changeTolerance = 10 means 10% of v1 = 20
    // (v1 - v2) * 100 = 100 * 100 = 10000
    // changeTolerance * v1 = 10 * 200 = 2000
    // 10000 < 2000 is false, so it should revert with "FE1"
    await expect(
      instance.connect(mockConfigurable).enforceTolerance(200, 100)
    ).to.be.revertedWith("FE1");
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
    bool public configured;
    
    function setConfigured(bool _configured) external {
        configured = _configured;
    }
}