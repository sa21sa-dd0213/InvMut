import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant mafdab9d9 - hasMajority >= instead of >", function () {
  it("should NOT finalise proposal when votes exactly equal consensus (half of totalWeight)", async function () {
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    
    // Deploy mock vault that returns controlled totalWeight
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    
    // Set totalWeight to 100 so consensus = 50
    await mockVault.setTotalWeight(100);
    
    // Deploy mock VADER and USDV
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();
    
    const MockUSDV = await ethers.getContractFactory("MockUSDV");
    const mockUSDV = await MockUSDV.deploy();
    await mockUSDV.waitForDeployment();
    
    // Deploy DAO
    const DAO = await ethers.getContractFactory("DAO");
    const dao = await DAO.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVault.getAddress());
    
    // Create a DAO-type proposal (will be proposal ID 1)
    await dao.newAddressProposal(owner.address, "DAO");
    
    // Set member weights: give addr1 exactly 50 weight
    await mockVault.setMemberWeight(addr1.address, 50);
    
    // Vote with addr1 - this should give exactly 50 votes = consensus
    await dao.connect(addr1).voteProposal(1);
    
    // Verify proposal is NOT finalising (should be false because votes == consensus, not >)
    const isFinalising = await dao.mapPID_finalising(1);
    expect(isFinalising).to.equal(false);
    
    // Also verify that vote count is exactly 50
    const votes = await dao.mapPID_votes(1);
    expect(votes).to.equal(50);
  });
});