import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test - configureSecurityParameters modifier", function () {
  it("should revert when calling configureSecurityParameters from an address without a successful proposal", async function () {
    const [owner, unauthorizedUser] = await ethers.getSigners();
    
    // Deploy a mock DAO that returns false for successfulProposal
    const MockDAO = await ethers.getContractFactory("MockLimboDAOLike");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with mock DAO
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Configure the contract to be configured (set configured = true via endConfiguration)
    // First, we need a successful proposal to call endConfiguration
    // For simplicity, we'll directly set configured state via the mock
    await mockDAO.setSuccessfulProposal(owner.address, true);
    await instance.endConfiguration();
    
    // Now try to call configureSecurityParameters from unauthorized user
    // The unauthorized user should NOT have a successful proposal
    await mockDAO.setSuccessfulProposal(unauthorizedUser.address, false);
    
    // Attempt to call configureSecurityParameters - should revert due to missing modifier
    await expect(
      instance.connect(unauthorizedUser).configureSecurityParameters(
        10, // maxGovernanceChangePerEpoch
        100, // epochSize
        50  // changeTolerance
      )
    ).to.be.revertedWith("EJ"); // The modifier asserts "EJ" when not successful proposal
    
    // Also verify that the owner (with successful proposal) CAN call it
    await expect(
      instance.connect(owner).configureSecurityParameters(
        10,
        100,
        50
      )
    ).to.not.be.reverted;
  });
});

// Helper contract to mock LimboDAOLike behavior
// This must be deployed alongside the test contract
contract MockLimboDAOLike {
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
    
    function setFlashGoverner(address _governer) external {
        flashGoverner = _governer;
    }
    
    function proposalConfig() external pure returns (uint256, uint256, address) {
        return (0, 0, address(0));
    }
}