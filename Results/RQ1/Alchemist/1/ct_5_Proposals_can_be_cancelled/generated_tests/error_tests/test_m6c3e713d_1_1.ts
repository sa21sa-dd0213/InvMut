import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - m6c3e713d", function () {
  it("should execute reward address change for REWARD proposal type", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock contracts for VADER, VAULT, and USDV
    const VADERFactory = await ethers.getContractFactory("iVADER");
    const vader = await VADERFactory.deploy();
    await vader.waitForDeployment();
    
    const VAULTFactory = await ethers.getContractFactory("iVAULT");
    const vault = await VAULTFactory.deploy();
    await vault.waitForDeployment();
    
    const USDVFactory = await ethers.getContractFactory("iERC20");
    const usdv = await USDVFactory.deploy();
    await usdv.waitForDeployment();
    
    // Deploy the DAO contract
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO with mock addresses
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
    
    // Create a REWARD type proposal
    await dao.newAddressProposal(addr1.address, "REWARD");
    
    // Get proposal ID (should be 1)
    const proposalID = 1;
    
    // Vote on the proposal to meet quorum (need > 1/3 of total weight)
    // For simplicity, we'll assume the vault returns sufficient weight
    // Vote from owner
    await dao.voteProposal(proposalID);
    
    // Check that proposal is now finalising
    expect(await dao.mapPID_finalising(proposalID)).to.be.true;
    
    // Wait for cool-off period (1 second)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine");
    
    // Call finaliseProposal - this should execute moveRewardAddress for REWARD type
    await dao.finaliseProposal(proposalID);
    
    // Verify the proposal was completed (finalised flag set to true)
    expect(await dao.mapPID_finalised(proposalID)).to.be.true;
    
    // Verify that setRewardAddress was called on VADER with addr1
    // We can check by verifying the VADER contract's reward address state
    // This assertion will fail on the mutant because moveRewardAddress is never called
    const rewardAddress = await vader.rewardAddress();
    expect(rewardAddress).to.equal(addr1.address);
  });
});