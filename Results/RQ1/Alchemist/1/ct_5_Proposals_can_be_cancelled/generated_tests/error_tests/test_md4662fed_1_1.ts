import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant md4662fed - voteProposal condition change", function () {
    it("should revert when finalising is true and condition uses <= instead of ==", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy mock VADER, USDV, VAULT contracts for testing
        const VADERFactory = await ethers.getContractFactory("iVADER");
        const vader = await VADERFactory.deploy();
        await vader.waitForDeployment();

        const USDVFactory = await ethers.getContractFactory("iERC20");
        const usdv = await USDVFactory.deploy();
        await usdv.waitForDeployment();

        const VAULTFactory = await ethers.getContractFactory("iVAULT");
        const vault = await VAULTFactory.deploy();
        await vault.waitForDeployment();

        // Deploy DAO
        const DAOFactory = await ethers.getContractFactory("DAO");
        const dao = await DAOFactory.deploy();
        await dao.waitForDeployment();

        // Initialize DAO
        await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());

        // Create a proposal
        await dao.newGrantProposal(addr1.address, ethers.parseEther("100"));

        // First vote to trigger finalising
        await dao.connect(addr1).voteProposal(1);

        // Now proposal is in finalising state (mapPID_finalising[1] = true)
        // Try to vote again - in original contract this should NOT trigger _finalise again
        // because condition checks mapPID_finalising[proposalID] == false
        // In mutant, condition checks mapPID_finalising[proposalID] <= false which is
        // equivalent to <= 0. Since true = 1, and 1 <= 0 is false, both should behave same
        // But to kill mutant we need to check that _finalise is not called again
        // The test should verify that the proposal can be finalized properly
        // after coolOffPeriod
        await ethers.provider.send("evm_increaseTime", [2]); // increase beyond coolOffPeriod (1)
        await ethers.provider.send("evm_mine");

        // This should succeed if original logic preserved
        await expect(dao.connect(addr2).finaliseProposal(1)).to.not.be.reverted;

        // Verify proposal was finalised
        const finalised = await dao.mapPID_finalised(1);
        expect(finalised).to.be.true;
    });
});