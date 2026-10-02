import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m9a640e07 - hasMinority >= replacement", function () {
  it("should revert cancelProposal when votes exactly equal minority threshold (totalWeight / 6)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock VADER, USDV, and VAULT contracts (simplified for testing)
    const VADERFactory = await ethers.getContractFactory("iVADER");
    const USDVFactory = await ethers.getContractFactory("iERC20");
    const VAULTFactory = await ethers.getContractFactory("iVAULT");
    
    const mockVADER = await VADERFactory.deploy();
    await mockVADER.waitForDeployment();
    
    const mockUSDV = await USDVFactory.deploy();
    await mockUSDV.waitForDeployment();
    
    const mockVAULT = await VAULTFactory.deploy();
    await mockVAULT.waitForDeployment();
    
    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());
    
    // Create two proposals of the same type
    await dao.connect(addr1).newAddressProposal(addr2.address, "UTILS");
    const oldProposalId = 1;
    
    await dao.connect(addr1).newAddressProposal(addr2.address, "UTILS");
    const newProposalId = 2;
    
    // Setup: make old proposal finalising (required for cancelProposal)
    // We need to trigger _finalise via voteProposal
    // First, set up vault to return specific totalWeight and memberWeight
    // We'll mock the vault to return totalWeight = 60 and memberWeight = 10
    // Then minority threshold = 60/6 = 10
    
    // Vote on old proposal to get it into finalising state
    // For simplicity, we can directly call _finalise by manipulating state
    // But since _finalise is internal, we'll use voteProposal with proper conditions
    
    // Set vault mock to return totalWeight = 60
    await mockVAULT.setTotalWeight(60);
    
    // Vote on old proposal - this should trigger _finalise if conditions met
    // We need quorum (votes > totalWeight/3 = 20) and the type check
    // Since it's "UTILS" type, we also need majority (votes > totalWeight/2 = 30)
    await mockVAULT.setMemberWeight(addr1.address, 31);
    await dao.connect(addr1).voteProposal(oldProposalId);
    
    // Now old proposal should be finalising
    expect(await dao.mapPID_finalising(oldProposalId)).to.be.true;
    
    // Now for the critical test: set member weight to exactly 10 (minority threshold = 60/6 = 10)
    await mockVAULT.setMemberWeight(addr1.address, 10);
    await mockVAULT.setTotalWeight(60);
    
    // Vote on new proposal to set its votes to exactly 10
    await dao.connect(addr1).voteProposal(newProposalId);
    
    // Verify new proposal has exactly 10 votes
    const newVotes = await dao.mapPID_votes(newProposalId);
    expect(newVotes).to.equal(10);
    
    // Now try to cancel old proposal with new proposal
    // In original contract: hasMinority requires votes > consensus (10 > 10 = false)
    // So cancelProposal should revert with "Must have minority"
    // In mutant: hasMinority requires votes >= consensus (10 >= 10 = true)
    // So cancelProposal would succeed (incorrectly)
    await expect(
      dao.connect(addr1).cancelProposal(oldProposalId, newProposalId)
    ).to.be.revertedWith("Must have minority");
  });
});