import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DAO mutant m09740471 - hasMajority always returns true", function () {
    it("should kill the mutant by proving hasMajority returns false when votes do not exceed half of total weight", async function () {
        const [owner, voter1, voter2] = await ethers.getSigners();
        
        // Deploy mock VAULT contract that we control for testing
        const VaultFactory = await ethers.getContractFactory("VAULT");
        const vault = await VaultFactory.deploy();
        await vault.waitForDeployment();
        
        // Deploy mock VADER contract
        const VaderFactory = await ethers.getContractFactory("VADER");
        const vader = await VaderFactory.deploy();
        await vader.waitForDeployment();
        
        // Deploy mock USDV contract
        const UsdvFactory = await ethers.getContractFactory("iERC20");
        const usdv = await UsdvFactory.deploy();
        await usdv.waitForDeployment();
        
        // Deploy DAO contract
        const DaoFactory = await ethers.getContractFactory("DAO");
        const dao = await DaoFactory.deploy();
        await dao.waitForDeployment();
        
        // Initialize DAO
        await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
        
        // Create a proposal to vote on
        await dao.newAddressProposal(owner.address, "DAO");
        const proposalId = 1;
        
        // Set up vault to return specific weights for testing
        // We need totalWeight = 100 and voter1 weight = 30 (less than 50% = 50)
        // First, let voter1 vote to accumulate votes
        await vault.setTotalWeight(100);
        await vault.setMemberWeight(voter1.address, 30);
        
        // Vote on the proposal
        await dao.connect(voter1).voteProposal(proposalId);
        
        // Now check hasMajority - should return false because 30 is not > 50 (half of 100)
        // In the mutant, it would return true always
        const hasMajority = await dao.hasMajority(proposalId);
        expect(hasMajority).to.equal(false);
        
        // Also verify that the proposal is NOT automatically finalised due to lack of majority
        const isFinalising = await dao.mapPID_finalising(proposalId);
        expect(isFinalising).to.equal(false);
    });
});