import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m140e3af9 - finaliseProposal cool-off period boundary test", function () {
  it("should revert when calling finaliseProposal exactly at the cool-off period boundary (original requires strict greater than)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock VADER, USDV, VAULT contracts
    const VADERFactory = await ethers.getContractFactory("iVADER");
    const USDVFactory = await ethers.getContractFactory("iERC20");
    const VAULTFactory = await ethers.getContractFactory("iVAULT");
    
    const vader = await VADERFactory.deploy();
    const usdv = await USDVFactory.deploy();
    const vault = await VAULTFactory.deploy();
    
    await vader.waitForDeployment();
    await usdv.waitForDeployment();
    await vault.waitForDeployment();
    
    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
    
    // Create a grant proposal
    await dao.newGrantProposal(addr1.address, ethers.parseEther("100"));
    
    // Vote on the proposal to make it finalising (need quorum and majority)
    // First need to setup vault to return weight for voting
    // We'll simulate by calling voteProposal which triggers _finalise if conditions met
    
    // To make the test work, we need to manipulate the vault's totalWeight 
    // to ensure hasQuorum and hasMajority pass for the proposal
    // We'll create a simple scenario where the proposal gets finalised
    
    // Get proposal ID (should be 1)
    const proposalID = 1;
    
    // Vote on the proposal to trigger finalising
    await dao.connect(addr1).voteProposal(proposalID);
    
    // Get the timeStart from the proposal after finalising
    // Since we can't directly access timeStart from external, we'll use block.timestamp
    // The proposal was finalised in the same block as voteProposal
    
    // Now get the current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const startTime = blockBefore.timestamp;
    
    // Fast forward to exactly the coolOffPeriod boundary (startTime + coolOffPeriod)
    await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + 1]); // coolOffPeriod = 1
    await ethers.provider.send("evm_mine");
    
    // Now call finaliseProposal - this should revert because original requires >
    // At exactly startTime + 1, elapsed = 1 which equals coolOffPeriod (1)
    // Original requires > 1, so should revert
    await expect(dao.connect(addr1).finaliseProposal(proposalID)).to.be.revertedWith("Must be after cool off");
  });
});