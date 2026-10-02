import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m5a359c90 - hasMajority returns false always", function () {
  it("should detect that hasMajority returns false even when votes exceed 50% of totalWeight", async function () {
    const [owner, voter1, voter2] = await ethers.getSigners();
    
    // Deploy mock VADER, USDV, and VAULT contracts
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSDV = await MockERC20.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();
    
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();
    
    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();
    
    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());
    
    // Setup vault with total weight
    // voter1 has 60 weight, voter2 has 40 weight (total = 100)
    await mockVAULT.setTotalWeight(100);
    await mockVAULT.setMemberWeight(voter1.address, 60);
    await mockVAULT.setMemberWeight(voter2.address, 40);
    
    // Create a proposal (any type will work)
    await dao.connect(voter1).newAddressProposal(voter2.address, "DAO");
    const proposalId = 1;
    
    // voter1 votes - this should give 60 votes out of 100 total weight
    await dao.connect(voter1).voteProposal(proposalId);
    
    // Now check hasMajority - should return true because 60 > 50 (half of 100)
    const hasMajority = await dao.hasMajority(proposalId);
    
    // On the original contract this would be true, on the mutant it returns false
    expect(hasMajority).to.equal(true);
  });
});