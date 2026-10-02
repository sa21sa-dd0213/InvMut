import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant m1fe5292f", function () {
  it("should kill the mutant by calling setGoverned with equal length arrays", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock DAO that returns true for successfulProposal
    const MockDAO = await ethers.getContractFactory("LimboDAOLike");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with mock DAO
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await FlashGovernanceArbiter.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Set up the DAO so that successfulProposal returns true for owner
    // This is needed because setGoverned has onlySuccessfulProposal modifier
    // We need to ensure the DAO address is set and successfulProposal returns true
    await instance.setDAO(await mockDAO.getAddress());
    
    // For the test to work with onlySuccessfulProposal modifier, we need to bypass it
    // by setting configured = false through endConfiguration or by making the DAO return true
    // Since we need to call setGoverned, we'll set up the DAO mock to return true
    
    // Mock the successfulProposal to return true for owner
    // We'll use a contract that implements the required interface
    
    const governables = [addr1.address, addr2.address];
    const isGoverned = [true, false];
    
    // This call should succeed on the original (equal lengths) 
    // and revert on the mutant (because mutant checks != instead of ==)
    await expect(
      instance.connect(owner).setGoverned(governables, isGoverned)
    ).to.not.be.reverted;
  });
});