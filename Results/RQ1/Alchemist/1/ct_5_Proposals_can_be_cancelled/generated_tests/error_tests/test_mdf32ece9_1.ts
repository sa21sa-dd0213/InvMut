import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - mdf32ece9 (grant proposal bypass)", function () {
  it("should execute grant proposal and transfer funds in original, but fail in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock VADER, USDV, and VAULT contracts for testing
    const VADERFactory = await ethers.getContractFactory("iVADER");
    const USDVFactory = await ethert.getContractFactory("iERC20");
    const VAULTFactory = await ethert.getContractFactory("iVAULT");
    
    const vader = await VADERFactory.deploy();
    const usdv = await USDVFactory.deploy();
    const vault = await VAULTFactory.deploy();
    
    // Deploy DAO with required constructor arguments
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO with contract addresses
    await dao.init(vader.target, usdv.target, vault.target);
    
    // Setup: fund the vault with USDV for grant testing
    const grantAmount = ethers.parseEther("1000");
    const vaultUsdvBalance = ethers.parseEther("10000"); // 10% of this = 1000
    await usdv.transfer(vault.target, vaultUsdvBalance);
    
    // Create a grant proposal
    const recipient = addr1.address;
    await dao.newGrantProposal(recipient, grantAmount);
    
    // Get proposal ID (starts at 1)
    const proposalId = 1;
    
    // Vote on the proposal (need quorum and majority)
    // Set up vault to return proper weights
    // Simulate voting power by having owner vote
    await dao.connect(owner).voteProposal(proposalId);
    
    // Wait for cool-off period
    await ethers.provider.send("evm_increaseTime", [2]); // coolOffPeriod = 1
    await ethers.provider.send("evm_mine", []);
    
    // Get recipient balance before finalisation
    const balanceBefore = await usdv.balanceOf(recipient);
    
    // Finalise the proposal
    await dao.connect(owner).finaliseProposal(proposalId);
    
    // Check that recipient received funds
    const balanceAfter = await usdv.balanceOf(recipient);
    
    // In original: balanceAfter > balanceBefore (grant executed)
    // In mutant: balanceAfter === balanceBefore (grant NOT executed)
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});