import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m46f8bf9f - enforceTolerance", function () {
  it("should revert when enforceTolerance is called with violating values from an active and configured caller", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy FlashGovernanceArbiter with a DAO address
    // For testing, we'll use addr1 as the DAO
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();

    // Set up the DAO to be configured and have successful proposals
    // First, we need to configure the DAO address
    await instance.connect(addr1).setDAO(addr1.address);

    // Deploy a mock Configurable contract to test enforceTolerance
    // We need to create a contract that implements the configured() function
    const ConfigurableMock = await ethers.getContractFactory(
      "contracts/mocks/ConfigurableMock.sol:ConfigurableMock"
    );
    const configurableMock = await ConfigurableMock.deploy();
    await configurableMock.waitForDeployment();

    // Enable enforcement for the configurableMock address
    await instance.connect(configurableMock.address).setEnforcement(true);

    // Configure security parameters with changeTolerance = 10%
    // We need to first make a successful proposal to call configureSecurityParameters
    // For simplicity, we can directly set the security parameters by calling the internal function
    // Since we have the DAO address set, we can use governanceApproved modifier
    
    // Configure security parameters directly via a successful proposal
    // The onlySuccessfulProposal modifier requires the sender to be a successful proposal
    // We need to bypass this for testing - let's use the owner as DAO
    
    // Re-deploy with owner as DAO for easier testing
    const instance2 = await Factory.deploy(owner.address);
    await instance2.waitForDeployment();

    // Set security parameters with changeTolerance = 10
    // We need to make the owner a successful proposal in the DAO
    // Since we don't have a real DAO, we'll set up the security directly
    // by calling the function through governance
    
    // For this test, we'll directly set the security parameters
    // by calling configureSecurityParameters after making owner a successful proposal
    // Actually, let's just test the enforceTolerance function directly
    
    // Configure security parameters - we need to bypass onlySuccessfulProposal
    // Let's use a different approach: deploy with owner and make owner the DAO
    await instance2.connect(owner).configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      100, // epochSize
      10  // changeTolerance (10%)
    );

    // Enable enforcement for the caller
    await instance2.connect(owner).setEnforcement(true);

    // Now test enforceTolerance with values that should violate
    // v1=100, v2=50 with changeTolerance=10%
    // Expected: (100-50)*100 = 5000 < 10*100 = 1000? No, 5000 > 1000, so should revert
    
    await expect(
      instance2.connect(owner).enforceTolerance(100, 50)
    ).to.be.revertedWith("FE1");

    // The mutant would NOT revert here because it returns early
    // This test will pass on the original but fail on the mutant
  });
});