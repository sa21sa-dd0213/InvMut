import { expect } from "chai";
import { ethers } } from "hardhat";

describe("FlashGovernanceArbiter mutant m38af87f2 - enforceTolerance v2==0 replacement", function () {
  it("should allow v1=1 when v2=0 in enforceTolerance, but mutant should revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock Configurable contract that returns configured() = true
    const ConfigurableFactory = await ethers.getContractFactory("MockConfigurable");
    const configurable = await ConfigurableFactory.deploy();
    await configurable.waitForDeployment();
    
    // Deploy a mock LimboDAO that returns a valid flash governor address
    const LimboDAOFactory = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await LimboDAOFactory.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy the FlashGovernanceArbiter with the mock DAO
    const FlashGovernanceArbiterFactory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiterFactory.deploy(await mockDAO.getAddress());
    await arbiter.waitForDeployment();
    
    // Configure the arbiter to have security parameters with changeTolerance < 100
    // First we need to make the DAO return successfulProposal(true) for owner
    await mockDAO.setSuccessfulProposal(true);
    
    // Configure security parameters
    await arbiter.connect(owner).configureSecurityParameters(
      50, // maxGovernanceChangePerEpoch
      3600, // epochSize
      50 // changeTolerance (must be < 100)
    );
    
    // Enable enforcement for the configurable contract
    await arbiter.connect(owner).setEnforcement(true);
    
    // Mark the configurable contract as governed so it can use enforceTolerance
    // But enforceTolerance doesn't require governed - it just needs enforceLimitsActive
    // The msg.sender must have enforceLimitsActive = true AND be a configured contract
    await arbiter.connect(configurable.getAddress() as any).setEnforcement(true);
    
    // Now test enforceTolerance with v1=1, v2=0
    // This should succeed in the original (since v2==0 allows v1<=1)
    // But the mutant replaces v2==0 with false, so it goes to else branch
    // In else branch: ((v2 - v1) * 100) < changeTolerance * v1
    // = ((0-1)*100) < 50*1 => underflow, so it reverts
    
    // The call should succeed on original but revert on mutant
    await expect(
      arbiter.connect(addr1).enforceTolerance(1, 0)
    ).to.be.revertedWith("FE1");
  });
});

// Helper mock contracts need to be deployed
// MockConfigurable - returns configured() = true
// MockLimboDAO - returns a valid flash governor address and successfulProposal