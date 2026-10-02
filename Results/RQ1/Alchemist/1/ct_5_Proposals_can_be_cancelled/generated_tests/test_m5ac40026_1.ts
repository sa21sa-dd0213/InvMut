import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO - kill mutant m5ac40026 (event emission removed)", function () {
  it("should emit FinalisedProposal event when completing a proposal", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock VADER, USDV, and VAULT contracts (simplified for testing)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    
    const usdv = await MockERC20.deploy("USDV", "USDV", 18);
    await usdv.waitForDeployment();
    
    const vader = await MockVADER.deploy();
    await vader.waitForDeployment();
    
    const vault = await MockVAULT.deploy();
    await vault.waitForDeployment();
    
    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
    
    // Create a grant proposal (simplest to test event emission)
    const grantAmount = ethers.parseEther("100");
    await dao.connect(addr1).newGrantProposal(addr2.address, grantAmount);
    
    // Get proposal ID (first proposal)
    const proposalID = 1;
    
    // Vote on proposal to meet quorum and trigger finalising
    // Need to set up vault to return weight for voting
    // For simplicity, we'll directly call finaliseProposal after time passes
    // First, we need to make the proposal finalising
    // In this test, we'll simulate by directly setting state or using available functions
    
    // Vote to trigger _finalise (needs quorum)
    // Set up vault to return some weight
    // Since we can't easily mock, we'll use the available functions
    
    // Actually, let's use a different approach - create a proposal and use the cancel/finalise flow
    // The event is emitted in completeProposal which is called from finaliseProposal
    
    // To make proposal finalising, we need hasQuorum to be true
    // Set vault totalWeight to a known value and vote to exceed 1/3
    
    // For this test, we'll set up the vault mock to return proper values
    // Then vote and wait for coolOff period
    
    // Vote on the proposal
    await dao.connect(addr1).voteProposal(proposalID);
    
    // Check if event is emitted when finalising
    // The event we care about is FinalisedProposal which is emitted in completeProposal
    // This happens in finaliseProposal after coolOff period
    
    // Wait for coolOff period (1 second as set in init)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // Now finalise the proposal - this should emit FinalisedProposal
    // But first we need to ensure hasQuorum passes
    
    // Since the mock vault might not have proper implementation,
    // we'll test the event emission directly by checking the transaction receipt
    
    const tx = await dao.connect(addr1).finaliseProposal(proposalID);
    const receipt = await tx.wait();
    
    // Check that FinalisedProposal event was emitted
    // The event signature: FinalisedProposal(address indexed member, uint indexed proposalID, uint votesCast, uint totalWeight, string proposalType)
    const event = receipt.logs.find(
      (log: any) => log.topics[0] === ethers.id("FinalisedProposal(address,uint256,uint256,uint256,string)")
    );
    
    expect(event).to.not.be.undefined;
  });
});