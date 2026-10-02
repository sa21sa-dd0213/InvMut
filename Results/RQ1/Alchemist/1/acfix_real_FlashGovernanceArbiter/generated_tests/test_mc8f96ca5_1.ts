import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant test - enforceTolerance v1==0 v2==0", function () {
  it("should revert when v1=0 and v2=0 after mutant changes <= to ==", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy with a valid DAO address (using owner as placeholder)
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Set configured to true to bypass the early return in enforceTolerance
    // First we need to set the DAO to a contract that returns configured() as true
    // Deploy a simple mock that returns configured() == true
    const MockConfigurable = await ethers.getContractFactory(
      "contracts/mocks/MockConfigurable.sol:MockConfigurable"
    );
    const mock = await MockConfigurable.deploy();
    await mock.waitForDeployment();

    // Set the mock as a governed contract so enforceLimitsActive can be set
    // We need to make a successful proposal first - use the DAO address directly
    // For testing, we can set the DAO to a contract that always returns true for successfulProposal
    const MockDAO = await ethers.getContractFactory(
      "contracts/mocks/MockDAO.sol:MockDAO"
    );
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();

    // Redeploy with the mock DAO
    const instance2 = await Factory.deploy(await mockDAO.getAddress());
    await instance2.waitForDeployment();

    // Call endConfiguration to set configured = true
    await instance2.endConfiguration();

    // Set enforceLimitsActive for the mock contract
    await instance2.setEnforcement(true);

    // Now call enforceTolerance with v1=0, v2=0
    // Original would allow v2 <= 1 (0 passes), mutant requires v2 == 1 (0 fails)
    await expect(
      instance2.enforceTolerance(0, 0)
    ).to.be.revertedWith("FE1");
  });
});