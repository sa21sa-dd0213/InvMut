import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m527bed79 test", function () {
  it("should detect mutant that removes require(v2 <= 1) when v1 == 0 in enforceTolerance", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock DAO contract that implements the required interfaces
    const MockDAOFactory = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAOFactory.deploy();
    await mockDAO.waitForDeployment();

    // Deploy FlashGovernanceArbiter with the mock DAO address
    const ArbiterFactory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await ArbiterFactory.deploy(await mockDAO.getAddress());
    await arbiter.waitForDeployment();

    // Configure the DAO to return the arbiter address for getFlashGoverner
    await mockDAO.setFlashGoverner(await arbiter.getAddress());

    // Deploy a mock Configurable contract to use as caller
    const MockConfigurableFactory = await ethers.getContractFactory("MockConfigurable");
    const mockConfigurable = await MockConfigurableFactory.deploy();
    await mockConfigurable.waitForDeployment();

    // Enable enforcement for the mock configurable contract address
    await arbiter.setEnforcement(true);

    // Set the mock configurable as configured
    await mockConfigurable.setConfigured(true);

    // Set security.changeTolerance to some value (e.g., 50)
    // Need to call configureSecurityParameters which requires successful proposal
    // First make the mock DAO return true for successfulProposal
    await mockDAO.setSuccessfulProposal(true);

    // Configure security parameters
    await arbiter.configureSecurityParameters(10, 1000, 50);

    // Now call enforceTolerance with v1 = 0, v2 = 2 from the mock configurable contract
    // This should revert in original but pass in mutant
    await expect(
      arbiter.connect(mockConfigurable).enforceTolerance(0, 2)
    ).to.be.revertedWith("FE1");
  });
});