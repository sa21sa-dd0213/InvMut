import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant mf24576e5", function () {
  it("should revert when governables.length < isGoverned.length due to exact length check", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock DAO that implements necessary functions
    const MockDAOFactory = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAOFactory.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with mock DAO
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Need to make a successful proposal to call setGoverned
    // First, configure the DAO to return true for successfulProposal
    await mockDAO.setSuccessfulProposal(owner.address, true);
    
    // Create arrays with mismatched lengths: governables shorter than isGoverned
    const governables = [owner.address]; // 1 element
    const isGoverned = [true, false];     // 2 elements
    
    // The original contract should revert due to length mismatch
    // The mutant would allow this and not revert, which is incorrect behavior
    await expect(
      instance.setGoverned(governables, isGoverned)
    ).to.be.revertedWith("LIMBO: length mismatch");
  });
});

// Helper mock contract for testing
// This would need to be deployed as a separate Solidity contract