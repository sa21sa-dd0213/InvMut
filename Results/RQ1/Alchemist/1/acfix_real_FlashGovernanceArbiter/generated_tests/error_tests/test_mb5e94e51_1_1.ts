import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant mb5e94e51", function () {
  it("should revert when changeTolerance = 99 in mutant, but pass in original", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock DAO that will allow successful proposals
    const MockDAODFactory = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAODFactory.deploy();
    await mockDAO.waitForDeployment();

    // Deploy the FlashGovernanceArbiter with the mock DAO address
    const FlashGovernanceArbiterFactory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiterFactory.deploy(await mockDAO.getAddress());
    await arbiter.waitForDeployment();

    // Set the DAO address in the arbiter to the mock DAO
    await arbiter.setDAO(await mockDAO.getAddress());

    // Configure the mock DAO to return true for successfulProposal for the owner
    await mockDAO.setSuccessfulProposal(owner.address, true);

    // Also need to set the proposal config to return a valid proposal factory
    const MockProposalFactory = await ethers.getContractFactory("MockProposalFactory");
    const mockFactory = await MockProposalFactory.deploy();
    await mockFactory.waitForDeployment();
    await mockDAO.setProposalConfig(100, 100, await mockFactory.getAddress());

    // Set soul update proposal address
    await mockFactory.setSoulUpdateProposal(owner.address);

    // Call configureSecurityParameters with changeTolerance = 99
    // In the original contract, this should succeed (99 < 100)
    // In the mutant, this should revert (require(99 > 100) is false)
    await expect(
      arbiter.connect(owner).configureSecurityParameters(
        10,       // maxGovernanceChangePerEpoch
        3600,     // epochSize
        99        // changeTolerance - valid in original, invalid in mutant
      )
    ).to.not.be.reverted;

    // Verify the value was set correctly in the original
    const security = await arbiter.security();
    expect(security.changeTolerance).to.equal(99);
  });
});

// Mock contracts needed for the test
contract MockLimboDAO {
  mapping(address => bool) public successfulProposals;
  address public flashGovernor;
  uint256 public votingDuration;
  uint256 public requiredFateStake;
  address public proposalFactory;

  function setSuccessfulProposal(address proposal, bool success) external {
    successfulProposals[proposal] = success;
  }

  function successfulProposal(address proposal) external view returns (bool) {
    return successfulProposals[proposal];
  }

  function setProposalConfig(uint256 _votingDuration, uint256 _requiredFateStake, address _proposalFactory) external {
    votingDuration = _votingDuration;
    requiredFateStake = _requiredFateStake;
    proposalFactory = _proposalFactory;
  }

  function proposalConfig() external view returns (uint256, uint256, address) {
    return (votingDuration, requiredFateStake, proposalFactory);
  }

  function getFlashGoverner() external view returns (address) {
    return flashGovernor;
  }

  function setFlashGovernor(address _governor) external {
    flashGovernor = _governor;
  }
}

contract MockProposalFactory {
  address public soulUpdateProposalAddress;

  function setSoulUpdateProposal(address _addr) external {
    soulUpdateProposalAddress = _addr;
  }

  function soulUpdateProposal() external view returns (address) {
    return soulUpdateProposalAddress;
  }
}