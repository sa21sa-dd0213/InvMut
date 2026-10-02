import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant mcddce925 - moveUtils zero address check", function () {
    it("should revert when trying to finalise a UTILS proposal with address(0) as proposed address", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy mock contracts for VADER, USDV, and VAULT
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const MockVADER = await ethers.getContractFactory("MockVADER");
        const MockVAULT = await ethers.getContractFactory("MockVAULT");
        
        const vader = await MockVADER.deploy();
        const usdv = await MockERC20.deploy("USDV", "USDV", 18);
        const vault = await MockVAULT.deploy();
        
        await vader.waitForDeployment();
        await usdv.waitForDeployment();
        await vault.waitForDeployment();
        
        // Deploy DAO
        const Factory = await ethers.getContractFactory("DAO");
        const dao = await Factory.deploy();
        await dao.waitForDeployment();
        
        // Initialize DAO
        await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
        
        // Create a UTILS proposal with address(0) as proposed address
        const proposalType = "UTILS";
        await dao.newAddressProposal(ethers.ZeroAddress, proposalType);
        
        // Get the proposal ID (should be 1)
        const proposalID = 1;
        
        // Setup vault to return a weight so the user has voting power
        // We need to mock getMemberWeight and totalWeight
        // For testing, we'll set up the vault mock to return sufficient weights
        await vault.setMemberWeight(owner.address, ethers.parseEther("100"));
        await vault.setTotalWeight(ethers.parseEther("100"));
        
        // Vote on the proposal to trigger finalising
        await dao.voteProposal(proposalID);
        
        // Wait for cool off period (1 second) to pass
        await ethers.provider.send("evm_increaseTime", [2]);
        await ethers.provider.send("evm_mine", []);
        
        // Try to finalise the proposal - should revert due to zero address check
        await expect(dao.finaliseProposal(proposalID)).to.be.revertedWith("No address proposed");
    });
});