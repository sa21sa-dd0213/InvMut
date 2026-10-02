import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m60abb3d6", function () {
  it("should kill mutant by verifying DAO address is properly set after deployment", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock DAO first since constructor requires a DAO address
    const MockDAOFactory = await ethers.getContractFactory("LimboDAOLike");
    const mockDAO = await MockDAOFactory.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with the mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // In the original contract, constructor calls Governable(dao) which sets DAO
    // In the mutant, Governable(dao) is not called, so DAO remains address(0)
    // Try calling setDAO which requires DAO == address(0) or msg.sender == DAO
    // If DAO is address(0), the first condition passes, so setDAO will succeed
    // But then flashGoverner() will fail because it tries to call LimboDAOLike(DAO).getFlashGoverner()
    // where DAO is still address(0), causing a revert
    
    // Test that DAO is properly initialized by calling flashGoverner indirectly
    // We can test this by calling assertGovernanceApproved which uses flashEnabled modifier
    // that checks msg.sender == DAO || governed[msg.sender]
    
    // First, let's check if DAO is properly set by trying to call setDAO from owner
    // In original: DAO is set, so this will revert (DAO != address(0) && msg.sender != DAO)
    // In mutant: DAO is address(0), so this will succeed (DAO == address(0))
    await expect(
      instance.setDAO(await owner.getAddress())
    ).to.be.revertedWith("EK");
    
    // If the above doesn't revert, the mutant is killed (DAO was not initialized)
  });
});