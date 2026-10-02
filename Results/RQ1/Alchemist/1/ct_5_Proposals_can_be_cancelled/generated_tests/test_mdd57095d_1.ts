import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant mdd57095d test - _finalise block.timestamp vs block.prevrandao", function () {
  it("should detect mutant by verifying coolOffPeriod enforcement using block.timestamp", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock VADER, USDV, and VAULT contracts needed by DAO
    const MockERC20 = await ethers.getContractFactory("iERC20");
    const MockVADER = await ethers.getContractFactory("iVADER");
    const MockVAULT = await ethers.getContractFactory("iVAULT");
    
    const mockUSDV = await MockERC20.deploy();
    await mockUSDV.waitForDeployment();
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();
    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();
    
    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());
    
    // Create a grant proposal (any proposal type works)
    await dao.connect(addr1).newGrantProposal(addr2.address, ethers.parseEther("100"));
    
    // Get proposal count to know the proposal ID
    const proposalCount = await dao.proposalCount();
    const proposalID = proposalCount;
    
    // Vote on the proposal to trigger _finalise (since quorum and majority needed)
    // Setup mock vault to return sufficient weight for quorum and majority
    // For simplicity, we'll directly test the _finalise effect by calling voteProposal
    // which calls _finalise internally when conditions are met
    
    // First, we need to ensure the vault returns enough totalWeight for quorum
    // Mock the totalWeight function of VAULT
    await mockVAULT.setTotalWeight(ethers.parseEther("1000"));
    
    // Vote - this should trigger _finalise if conditions are met
    // But we need to set up the member weight first
    await mockVAULT.setMemberWeight(addr1.address, ethers.parseEther("500"));
    
    // Call voteProposal which internally calls _finalise
    await dao.connect(addr1).voteProposal(proposalID);
    
    // Check that timeStart was set (should be block.timestamp in original)
    const timeStart = await dao.mapPID_timeStart(proposalID);
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;
    
    // In original: timeStart should equal currentTimestamp (approximately)
    // In mutant: timeStart would be block.prevrandao (random value)
    // The difference |timeStart - currentTimestamp| should be small (0-1 seconds) in original
    const diff = Math.abs(Number(timeStart) - Number(currentTimestamp));
    
    // If mutant is present, diff will likely be large because prevrandao is random
    // This test will fail on mutant because timeStart won't match block.timestamp
    expect(diff).to.be.lessThanOrEqual(2);
    
    // Additional check: finaliseProposal should work after coolOffPeriod
    // Wait for coolOffPeriod (1 second)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine");
    
    // Try to finalise - should work on original, might fail on mutant
    // because timeStart is not block.timestamp
    const tx = dao.connect(addr1).finaliseProposal(proposalID);
    
    // On original: should succeed because coolOffPeriod has passed
    // On mutant: may revert because timeStart is random
    // We expect success on original, so revert would indicate mutant
    await expect(tx).to.not.be.reverted;
    
    // Verify finalised state
    const finalised = await dao.mapPID_finalised(proposalID);
    expect(finalised).to.equal(true);
  });
});