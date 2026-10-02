import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DAO mutant m51b671ee - coolOffPeriod bypass test", function () {
    it("should revert if finaliseProposal is called before coolOffPeriod has elapsed", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy VADER mock (simplified - just enough to satisfy interface)
        const VADERFactory = await ethers.getContractFactory("iVADER");
        const vader = await VADERFactory.deploy();
        await vader.waitForDeployment();
        
        // Deploy USDV mock
        const USDVFactory = await ethers.getContractFactory("iERC20");
        const usdv = await USDVFactory.deploy();
        await usdv.waitForDeployment();
        
        // Deploy VAULT mock
        const VAULTFactory = await ethers.getContractFactory("iVAULT");
        const vault = await VAULTFactory.deploy();
        await vault.waitForDeployment();
        
        // Deploy DAO
        const DAOFactory = await ethers.getContractFactory("DAO");
        const dao = await DAOFactory.deploy();
        await dao.waitForDeployment();
        
        // Initialize DAO
        await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
        
        // Create a grant proposal first (to have a proposal to finalise)
        await dao.newGrantProposal(addr1.address, ethers.parseEther("100"));
        
        // Vote on proposal to trigger _finalise (which sets mapPID_timeStart and mapPID_finalising)
        await dao.connect(addr1).voteProposal(1);
        
        // Now try to call finaliseProposal immediately (before coolOffPeriod = 1 second has elapsed)
        await expect(
            dao.finaliseProposal(1)
        ).to.be.revertedWith("Must be after cool off");
    });
});