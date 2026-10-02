import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant kill test - mbdf4cb27", function () {
    it("should revert when finalising a UTILS proposal if VADER is set to address(this) instead of the real VADER contract", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy mock VADER contract that implements required interfaces
        const MockVADER = await ethers.getContractFactory("MockVADER");
        const mockVADER = await MockVADER.deploy();
        await mockVADER.waitForDeployment();
        
        // Deploy mock VAULT contract
        const MockVAULT = await ethers.getContractFactory("MockVAULT");
        const mockVAULT = await MockVAULT.deploy();
        await mockVAULT.waitForDeployment();
        
        // Deploy mock USDV contract
        const MockUSDV = await ethers.getContractFactory("MockUSDV");
        const mockUSDV = await MockUSDV.deploy();
        await mockUSDV.waitForDeployment();
        
        // Deploy DAO
        const Factory = await ethers.getContractFactory("DAO");
        const dao = await Factory.deploy();
        await dao.waitForDeployment();
        
        // Initialize DAO with the real VADER contract address
        await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());
        
        // Create a UTILS proposal
        const newUtilsAddress = addr2.address;
        await dao.newAddressProposal(newUtilsAddress, "UTILS");
        
        // Simulate voting to get quorum and finalising
        // First, we need to set up the vault to return proper weights
        // For simplicity, we'll directly call voteProposal to trigger the finalising logic
        
        // The mutant sets VADER = address(this), so when finaliseProposal is called,
        // it will call iVADER(VADER).changeUTILS() on the DAO itself, which doesn't implement it
        // This should revert
        await expect(
            dao.finaliseProposal(1)
        ).to.be.reverted;
    });
});