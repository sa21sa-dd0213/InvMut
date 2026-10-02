import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant mf6c88102", function () {
  it("should revert enforceTolerance when v1=0 and v2>1 in original, but pass in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock DAO contract that returns a flash governor address
    const MockDAO = await ethers.getContractFactory("LimboDAOLike");
    const mockDAO = await MockDAO.deploy();
    
    // Deploy a mock Configurable contract that returns configured() = true
    const MockConfigurable = await ethers.getContractFactory("Configurable");
    const mockConfigurable = await MockConfigurable.deploy();
    
    // Deploy the FlashGovernanceArbiter with the mock DAO address
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiter.deploy(mockDAO.target);
    await arbiter.waitForDeployment();
    
    // Set up enforcement for addr1
    await arbiter.connect(addr1).setEnforcement(true);
    
    // Configure security parameters with changeTolerance = 50 (50%)
    // Need to call via successful proposal - we'll set DAO to bypass check
    // First, configure the DAO to return true for successfulProposal
    // For simplicity, we can use the fact that configured is false initially
    // So assertSuccessfulProposal will pass (since !configured is true)
    
    // Configure security parameters
    await arbiter.connect(owner).configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      3600, // epochSize
      50 // changeTolerance (50%)
    );
    
    // End configuration to enable enforcement
    await arbiter.connect(owner).endConfiguration();
    
    // Now test the mutant: call enforceTolerance with v1=0, v2=2
    // In the original: when v1==0, require(v2 <= 1, "FE1") - should revert with v2=2
    // In the mutant: if(false) require(...) - the check is skipped, so no revert
    
    // This should revert in the original but pass in the mutant
    // We expect it to revert because the mutant should be killed
    await expect(
      arbiter.connect(addr1).enforceTolerance(0, 2)
    ).to.be.revertedWith("FE1");
  });
});