import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m4f2be63e test", function () {
  it("should revert when v1 > v2 and v2 != 0 but the mutant incorrectly enforces v1 <= 1", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock DAO that returns a flash governor address
    const MockDAOFactory = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAOFactory.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy the FlashGovernanceArbiter with the mock DAO
    const ArbiterFactory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await ArbiterFactory.deploy(await mockDAO.getAddress());
    await arbiter.waitForDeployment();
    
    // Set up the contract to be configured and have enforcement active
    // First, we need to set DAO and configure it
    await arbiter.setDAO(await mockDAO.getAddress());
    await arbiter.endConfiguration();
    
    // Enable enforcement for the caller
    await arbiter.setEnforcement(true);
    
    // Configure security parameters with a tolerance that would allow the transaction
    // in the original code but should fail in the mutant
    await arbiter.configureSecurityParameters(
      50, // maxGovernanceChangePerEpoch
      100, // epochSize
      60  // changeTolerance (60%)
    );
    
    // Now call enforceTolerance with v1=100, v2=50 (v1 > v2, v2 != 0)
    // In the original code: since v2 != 0, it goes to else branch
    // ((100-50)*100) < 60*100 => 5000 < 6000 => true, so it passes
    // In the mutant: since condition is always true (v2==0 replaced with true)
    // it executes require(v1 <= 1, "FE1") which reverts because 100 > 1
    await expect(
      arbiter.connect(addr1).enforceTolerance(100, 50)
    ).to.be.revertedWith("FE1");
  });
});

// Helper contract to mock the LimboDAOLike interface
// This needs to be deployed as a separate contract for the test to work