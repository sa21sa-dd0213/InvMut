import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m20537bd3 test", function () {
  it("should revert when enforceTolerance is called with v2 > v1 and percentage difference exceeds changeTolerance", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a mock DAO
    const MockDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();

    // Deploy the FlashGovernanceArbiter
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();

    // Set DAO to allow us to configure
    await instance.setDAO(await mockDAO.getAddress());

    // Make owner a successful proposal
    await mockDAO.setSuccessfulProposal(owner.address, true);

    // Configure flash governance first (required for some functions)
    await instance.configureFlashGovernance(
      ethers.ZeroAddress,
      0,
      0,
      false
    );

    // Configure security parameters with changeTolerance = 10
    await instance.configureSecurityParameters(
      10,
      3600,
      10
    );

    // Set enforcement for the test helper
    await instance.setEnforcement(true);

    // Deploy a test helper contract
    const TestHelper = await ethers.getContractFactory("TestHelper");
    const testHelper = await TestHelper.deploy(await instance.getAddress());
    await testHelper.waitForDeployment();

    // Set enforcement for the test helper
    await instance.connect(testHelper).setEnforcement(true);

    // Now call enforceTolerance through the test helper
    // v1=100, v2=200 - this should revert in original but pass in mutant
    await expect(
      testHelper.callEnforceTolerance(100, 200)
    ).to.be.revertedWith("FE1");
  });
});