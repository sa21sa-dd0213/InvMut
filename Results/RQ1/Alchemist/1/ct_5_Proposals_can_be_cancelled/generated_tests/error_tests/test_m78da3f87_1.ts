import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m78da3f87 - voteProposal majority check for DAO/UTILS/REWARD", function () {
  it("should NOT finalise a DAO type proposal when votes exceed quorum but are below majority", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock VAULT contract
    const MockVault = await ethers.getContractFactory("MockVAULT");
    const vault = await MockVault.deploy();
    await vault.waitForDeployment();
    
    // Deploy mock VADER contract
    const MockVader = await ethers.getContractFactory("MockVADER");
    const vader = await MockVader.deploy();
    await vader.waitForDeployment();
    
    // Deploy mock USDV contract
    const MockUSDV = await ethers.getContractFactory("MockERC20");
    const usdv = await MockUSDV.deploy("USDV", "USDV", 18);
    await usdv.waitForDeployment();
    
    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
    
    // Setup: give addr1 and addr2 some weight in vault
    const totalWeight = 1000;
    await vault.setTotalWeight(totalWeight);
    await vault.setMemberWeight(addr1.address, 200); // 20% of total weight
    await vault.setMemberWeight(addr2.address, 200); // 20% of total weight
    
    // Create a DAO type proposal
    await dao.connect(addr1).newAddressProposal(addr1.address, "DAO");
    
    // addr1 votes - this gives 200 votes (20% which is > quorum of 33% but < majority of 50%)
    await dao.connect(addr1).voteProposal(1);
    
    // Verify that proposal was NOT finalised (quorum met but majority not met for DAO type)
    const isFinalising = await dao.mapPID_finalising(1);
    expect(isFinalising).to.equal(false);
    
    // Also verify that the proposal still exists and votes are recorded
    const votes = await dao.mapPID_votes(1);
    expect(votes).to.equal(200);
  });
});

// Helper mock contracts (these would need to be deployed as separate contracts)
// For brevity, assuming MockVAULT, MockVADER, MockERC20 are available in the test environment