import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant test - enforceTolerance v1==0 v2==0", function () {
  it("should revert when v1=0 and v2=0 after mutant changes <= to ==", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy mock DAO that returns successfulProposal as true
    const MockDAO = await ethers.getContractFactory(
      "contracts/mocks/MockDAO.sol:MockDAO"
    );
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();

    // Deploy the FlashGovernanceArbiter with the mock DAO
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();

    // Set configured to true
    await instance.endConfiguration();

    // Deploy a mock configurable contract that returns configured() == true
    const MockConfigurable = await ethers.getContractFactory(
      "contracts/mocks/MockConfigurable.sol:MockConfigurable"
    );
    const mock = await MockConfigurable.deploy();
    await mock.waitForDeployment();

    // Set enforcement for the mock contract address
    await instance.setEnforcement(true);

    // Now call enforceTolerance from the mock configurable contract
    // The mock needs to call enforceTolerance on the arbiter
    // We'll use a low-level call from the mock's address
    await expect(
      instance.connect(await ethers.getImpersonatedSigner(await mock.getAddress())).enforceTolerance(0, 0)
    ).to.be.revertedWith("FE1");
  });
});