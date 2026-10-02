import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m323bbd27", function () {
  it("should revert when percentage change equals tolerance (strictly less required)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a minimal DAO mock that satisfies the constructor requirements
    const DAOFactory = await ethers.getContractFactory("LimboDAOMock");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with the DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await dao.getAddress());
    await instance.waitForDeployment();
    
    // Set up: need to call configureSecurityParameters via onlySuccessfulProposal
    // First, set DAO configured state so assertSuccessfulProposal passes
    // For testing enforceTolerance directly, we need to bypass governance checks
    // by calling the public view function enforceTolerance
    
    // Configure security parameters with changeTolerance = 10 (10%)
    // We need to make a successful proposal first
    // Set up the DAO mock to return true for successfulProposal
    await dao.setSuccessfulProposal(owner.address, true);
    
    // Call configureSecurityParameters
    await instance.connect(owner).configureSecurityParameters(
      1,    // maxGovernanceChangePerEpoch
      3600, // epochSize
      10    // changeTolerance = 10%
    );
    
    // Set enforcement to true for addr1
    await instance.connect(addr1).setEnforcement(true);
    
    // Now test the mutant: v1=100, v2=90 => (100-90)*100 = 1000, changeTolerance*v1 = 10*100 = 1000
    // Original requires <, so this should revert. Mutant uses <=, so it would pass.
    await expect(
      instance.connect(addr1).enforceTolerance(100, 90)
    ).to.be.revertedWith("FE1");
  });
});

// Minimal mock contract to satisfy constructor requirements
// This would need to be deployed as a separate contract in the test environment
contract LimboDAOMock {
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
  
  function proposalConfig() external view returns (uint256, uint256, address) {
    return (0, 0, address(0));
  }
}