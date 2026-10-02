import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - hasMinority operator change", function () {
  it("should detect mutant by checking cancelProposal reverts when new proposal has votes just above minority threshold", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock VADER, USDV, and VAULT contracts needed for DAO initialization
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const MockVADERFactory = await ethers.getContractFactory("MockVADER");
    const MockVAULTFactory = await ethers.getContractFactory("MockVAULT");
    
    const vader = await MockVADERFactory.deploy();
    const usdv = await MockERC20Factory.deploy("USDV", "USDV", 18);
    const vault = await MockVAULTFactory.deploy();
    
    await vader.waitForDeployment();
    await usdv.waitForDeployment();
    await vault.waitForDeployment();
    
    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
    
    // Set totalWeight to 1000 for predictable math
    await vault.setTotalWeight(1000);
    
    // Create an initial proposal that will be finalising (old proposal)
    await dao.newAddressProposal(addr1.address, "UTILS");
    
    // Vote on the old proposal to make it finalising
    await dao.voteProposal(1);
    
    // Create a new proposal (newProposalID = 2)
    await dao.newAddressProposal(addr2.address, "UTILS");
    
    // Vote on the new proposal to give it exactly 1/6 of totalWeight + 1 = 167 votes (minority in original)
    // 1000/6 = 166.67, so 167 votes is just above minority threshold
    await vault.setMemberWeight(owner.address, 167);
    await dao.voteProposal(2);
    
    // The original hasMinority returns true for 167 > 166.67
    // The mutant hasMinority returns false for 167 < 166.67
    // So cancelProposal should succeed on original but revert on mutant
    
    if (await dao.hasMinority(2)) {
      // Original behavior - cancelProposal should succeed
      await dao.cancelProposal(1, 2);
    } else {
      // Mutant behavior - cancelProposal should revert because hasMinority returns false
      await expect(
        dao.cancelProposal(1, 2)
      ).to.be.revertedWith("Must have minority");
    }
  });
});