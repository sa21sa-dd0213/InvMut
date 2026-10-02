import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test - enforceTolerance", function () {
  it("should kill mutant mdfedb812 by calling enforceTolerance with v1 < v2 and expecting correct tolerance calculation", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract - FlashGovernanceArbiter constructor takes (address dao)
    // We need a DAO contract that implements the required interfaces
    const DAOFactory = await ethers.getContractFactory("LimboDAOLike");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await dao.getAddress());
    await instance.waitForDeployment();

    // Configure security parameters with a specific changeTolerance (e.g., 10%)
    // Set the DAO address
    await instance.setDAO(await dao.getAddress());

    // Configure security parameters - need to set changeTolerance first
    // We need to make the DAO return true for successfulProposal
    // For this test, we'll directly set the security parameters via storage manipulation
    // First, set configured to true so we can pass the require checks
    await instance.endConfiguration();

    // Now set the security parameters directly using setter
    // Since we need onlySuccessfulProposal, we'll set the storage directly for testing
    // Actually, let's use a different approach - set enforceLimitsActive and make the contract think it's configured
    
    // Set enforceLimitsActive for addr1
    await instance.connect(addr1).setEnforcement(true);

    // Now call enforceTolerance with v1=50, v2=100
    // The original contract should revert because the tolerance check fails
    // (100-50)*100 = 5000 >= 10*50 = 500, so it reverts with "FE1"
    // The mutant would not revert because it uses wrong formula
    await expect(
      instance.connect(addr1).enforceTolerance(50, 100)
    ).to.be.revertedWith("FE1");
  });
});