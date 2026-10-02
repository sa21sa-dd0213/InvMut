import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - cancelProposal without finalising check", function () {
    it("should revert when cancelProposal is called on a proposal that is not in finalising state", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy DAO contract (no constructor arguments)
        const Factory = await ethers.getContractFactory("DAO");
        const dao = await Factory.deploy();
        await dao.waitForDeployment();
        
        // Deploy mock VADER and VAULT contracts (we need them for init)
        const VADERFactory = await ethers.getContractFactory("iVADER");
        const vader = await VADERFactory.deploy();
        await vader.waitForDeployment();
        
        const VAULTFactory = await ethers.getContractFactory("iVAULT");
        const vault = await VAULTFactory.deploy();
        await vault.waitForDeployment();
        
        const USDVFactory = await ethers.getContractFactory("iERC20");
        const usdv = await USDVFactory.deploy();
        await usdv.waitForDeployment();
        
        // Initialize DAO
        await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
        
        // Create a new proposal (e.g., address proposal)
        await dao.connect(addr1).newAddressProposal(addr2.address, "DAO");
        
        // Attempt to cancel proposal 1 with a non-existent proposal 2 (not in finalising state)
        // The original contract requires mapPID_finalising[oldProposalID] to be true
        // Mutant removes this check, so it would not revert
        await expect(
            dao.connect(addr1).cancelProposal(1, 2)
        ).to.be.revertedWith("Must be finalising");
    });
});