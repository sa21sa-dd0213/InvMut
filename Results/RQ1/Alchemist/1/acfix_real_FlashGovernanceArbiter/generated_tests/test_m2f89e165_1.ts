import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m2f89e165 test", function () {
  it("should detect the mutant by calling enforceToleranceInt with positive value when enforcement is active", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock DAO that returns the necessary values
    const MockDAODAO = await ethers.getContractFactory("MockLimboDAOLike");
    const mockDAO = await MockDAODAO.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy the FlashGovernanceArbiter with the mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Deploy a mock configurable contract that returns configured() = true
    const MockConfigurable = await ethers.getContractFactory("MockConfigurable");
    const mockConfigurable = await MockConfigurable.deploy();
    await mockConfigurable.waitForDeployment();
    
    // Enable enforcement for the mock configurable contract
    await instance.setEnforcement(true);
    
    // Configure the security parameters with a reasonable changeTolerance
    // First need to make addr1 a successful proposal to call configureSecurityParameters
    // We'll use the mock DAO to simulate this
    await mockDAO.setSuccessfulProposal(addr1.address, true);
    
    // Configure security parameters via addr1 (as successful proposal)
    await instance.connect(addr1).configureSecurityParameters(
      50, // maxGovernanceChangePerEpoch
      100, // epochSize
      10 // changeTolerance (10%)
    );
    
    // Now call enforceToleranceInt with a positive v1 value
    // Original: positive v1 stays positive, uv1 = v1
    // Mutant: positive v1 becomes -v1 (negative), causing underflow when cast to uint256
    
    // The original would allow this call to proceed normally
    // The mutant should revert due to underflow or incorrect comparison
    
    // Call enforceToleranceInt with v1=5, v2=10 (positive values)
    // The original should pass this through to enforceTolerance
    // The mutant will compute uv1 = uint256(-5) which underflows to max uint256
    // This will cause the enforceTolerance function to revert with "FE1"
    
    await expect(
      instance.connect(mockConfigurable.getAddress()).enforceToleranceInt(5, 10)
    ).to.be.reverted;
  });
});

// Mock contracts needed for the test
contract MockLimboDAOLike {
  mapping(address => bool) public successfulProposals;
  
  function setSuccessfulProposal(address proposer, bool success) external {
    successfulProposals[proposer] = success;
  }
  
  function successfulProposal(address proposal) external view returns (bool) {
    return successfulProposals[proposal];
  }
  
  function getFlashGoverner() external view returns (address) {
    return address(0);
  }
  
  function proposalConfig() external view returns (uint256, uint256, address) {
    return (0, 0, address(0));
  }
}

contract MockConfigurable {
  function configured() external view returns (bool) {
    return true;
  }
}