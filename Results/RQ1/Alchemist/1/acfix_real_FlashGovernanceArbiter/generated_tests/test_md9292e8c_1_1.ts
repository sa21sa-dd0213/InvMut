import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant md9292e8c detection", function () {
  it("should detect the mutant by calling enforceTolerance with values where percentage change is less than tolerance, expecting no revert on original but revert on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a minimal mock DAO contract that the FlashGovernanceArbiter constructor requires
    const MockDAOFactory = await ethers.getContractFactory("LimboDAOLike");
    const mockDAO = await MockDAOFactory.deploy();
    await mockDAO.waitForDeployment();

    // Deploy FlashGovernanceArbiter with the mock DAO
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();

    // Configure security parameters to set changeTolerance to 10
    // First need to make a successful proposal to configure
    // We'll use the DAO's successfulProposal to return true for our address
    await mockDAO.setSuccessfulProposal(owner.address, true);

    // Configure security parameters with changeTolerance = 10
    await instance.configureSecurityParameters(10, 1000, 10);

    // Set enforcement for our address
    await instance.setEnforcement(true);

    // Deploy a mock configurable contract that returns configured() = true
    const MockConfigurableFactory = await ethers.getContractFactory("Configurable");
    const mockConfigurable = await MockConfigurableFactory.deploy();
    await mockConfigurable.waitForDeployment();

    // Configure the mock configurable to return true for configured()
    await mockConfigurable.setConfigured(true);

    // Call enforceTolerance from the mock configurable address
    // v1 = 100, v2 = 105, changeTolerance = 10
    // Percentage change = (105-100)*100/100 = 5%
    // Original: 5 < 10 → passes (no revert)
    // Mutant: 5 > 10 → false → reverts with "FE1"
    await expect(
      instance.connect(mockConfigurable).enforceTolerance(100, 105)
    ).to.be.revertedWith("FE1");
  });
});