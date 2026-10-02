import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant ma1df5d00 (enforceTolerance power operator)", function () {
  it("should detect mutant by calling enforceTolerance with v1=100, v2=105 and changeTolerance=10, expecting revert in mutant but pass in original", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a minimal DAO mock that returns required values for Governable constructor
    const DAOMockFactory = await ethers.getContractFactory("LimboDAOMock");
    const daoMock = await DAOMockFactory.deploy();
    await daoMock.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with DAO address
    const FlashGovernanceArbiterFactory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiterFactory.deploy(await daoMock.getAddress());
    await arbiter.waitForDeployment();
    
    // Configure security parameters with changeTolerance = 10 (10%)
    // First we need to make a successful proposal to call configureSecurityParameters
    // For testing, we'll set configured=false by not calling endConfiguration, and bypass onlySuccessfulProposal
    // Actually, we need to set security.changeTolerance directly since we can't easily make proposals
    // Let's deploy a simpler test by directly setting the security struct via a helper
    
    // Alternative approach: deploy a version where we can set security directly
    // Or we can use the fact that when configured=false, assertSuccessfulProposal passes
    // Let's set the security parameters through configureSecurityParameters
    // Since configured is false initially, onlySuccessfulProposal will pass
    
    await arbiter.configureSecurityParameters(5, 86400, 10); // maxGovernanceChangePerEpoch=5, epochSize=86400, changeTolerance=10
    
    // Set enforceLimitsActive for addr1 to true so the enforceTolerance check runs
    await arbiter.setEnforcement(true);
    
    // Now call enforceTolerance from addr1 with values that will trigger the else branch
    // v1=100, v2=105 => v2 > v1, so we go to else branch: ((105-100)*100) < 10*100 => 500 < 1000 => true (should pass)
    // But mutant calculates (5**100) which is astronomically large, so (5**100) < 1000 => false => revert
    
    // We need to call from addr1 because enforceLimitsActive is checked per sender
    await expect(
      arbiter.connect(addr1).enforceTolerance(100, 105)
    ).to.not.be.reverted; // Original passes, mutant would revert
  });
});

// Helper contract to satisfy constructor requirements
// This mock LimboDAO must be deployed separately
contract LimboDAOMock {
  function getFlashGoverner() external view returns (address) { return address(0); }
  function successfulProposal(address) external view returns (bool) { return true; }
  function proposalConfig() external view returns (uint256, uint256, address) { return (0, 0, address(0)); }
}