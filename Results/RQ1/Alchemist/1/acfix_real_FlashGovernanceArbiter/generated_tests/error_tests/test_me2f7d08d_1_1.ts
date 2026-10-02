import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant detection - me2f7d08d", function () {
  it("should revert when changeTolerance is set to 100 (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock DAO that returns a successful proposal for owner
    const MockDaoFactory = await ethers.getContractFactory("MockLimboDAO");
    const mockDao = await MockDaoFactory.deploy();
    await mockDao.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDao.getAddress());
    await instance.waitForDeployment();
    
    // Set up a successful proposal for the owner
    await mockDao.setSuccessfulProposal(owner.address, true);
    
    // Try to set changeTolerance to 100 - should revert in original
    await expect(
      instance.connect(owner).configureSecurityParameters(
        50, // maxGovernanceChangePerEpoch
        1000, // epochSize
        100 // changeTolerance - this is the boundary value
      )
    ).to.be.revertedWith("Limbo: % between 0 and 100");
  });
});