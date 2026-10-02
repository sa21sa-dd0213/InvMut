import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant m4d5dd285", function () {
  it("should revert when burnFlashGovernanceAsset is called by an address without a successful proposal", async function () {
    const [owner, unauthorizedUser] = await ethers.getSigners();
    
    // Deploy a mock DAO contract that returns false for successfulProposal
    const MockDAOFactory = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAOFactory.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy the FlashGovernanceArbiter with the mock DAO
    const FlashGovernanceArbiterFactory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiterFactory.deploy(await mockDAO.getAddress());
    await arbiter.waitForDeployment();
    
    // Configure the contract by calling endConfiguration on Governable
    await arbiter.connect(owner).endConfiguration();
    
    // Try to call burnFlashGovernanceAsset from an unauthorized user
    // The original contract would revert with "EJ" because of the onlySuccessfulProposal modifier
    // The mutant would allow the call to proceed (no modifier)
    await expect(
      arbiter.connect(unauthorizedUser).burnFlashGovernanceAsset(
        unauthorizedUser.address,
        unauthorizedUser.address,
        ethers.ZeroAddress,
        0
      )
    ).to.be.revertedWith("EJ");
  });
});

// Mock contract to simulate LimboDAOLike behavior
contract MockLimboDAO {
  function successfulProposal(address) external pure returns (bool) {
    return false;
  }
  
  function getFlashGoverner() external pure returns (address) {
    return address(0);
  }
  
  function proposalConfig() external pure returns (uint256, uint256, address) {
    return (0, 0, address(0));
  }
}