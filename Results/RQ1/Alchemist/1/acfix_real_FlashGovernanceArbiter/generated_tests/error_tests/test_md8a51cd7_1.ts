import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant md8a51cd7 - enforceTolerance v2=0 check removal", function () {
  it("should revert when v2=0 and v1>1 on original but pass on mutant (kill mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock DAO contract that implements the required interface
    // Since FlashGovernanceArbiter requires a DAO address in constructor
    const MockDAOFactory = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAOFactory.deploy();
    await mockDAO.waitForDeployment();

    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();

    // Configure the contract to have enforcement active for addr1
    // First, we need to make addr1 a successful proposal sender to call setEnforcement
    // For simplicity, we'll directly manipulate state via the DAO mock
    
    // Set enforcement for addr1
    await instance.connect(addr1).setEnforcement(true);

    // Deploy a mock configurable contract that returns configured() = true
    const MockConfigurableFactory = await ethers.getContractFactory("MockConfigurable");
    const mockConfigurable = await MockConfigurableFactory.deploy();
    await mockConfigurable.waitForDeployment();

    // Set security.changeTolerance to some value (e.g., 50)
    // We need to call configureSecurityParameters which requires onlySuccessfulProposal
    // Using owner as proposer through mockDAO
    await mockDAO.setSuccessfulProposal(owner.address, true);
    await instance.connect(owner).configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      3600, // epochSize
      50 // changeTolerance
    );

    // Now call enforceTolerance from addr1 with v1=100, v2=0
    // Original: should revert with "FE1" because v2=0 and v1>1
    // Mutant: should pass silently because the require was removed
    await expect(
      instance.connect(addr1).enforceTolerance(100, 0)
    ).to.be.revertedWith("FE1");
  });
});