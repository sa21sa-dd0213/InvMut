import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant detection - m114b8d50", function () {
    it("should detect mutant that replaces isEqual(_type, 'REWARD') with true", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy VADER mock (simplified interface for testing)
        const VADERFactory = await ethers.getContractFactory("VADERMock");
        const vader = await VADERFactory.deploy();
        await vader.waitForDeployment();
        
        // Deploy VAULT mock
        const VAULTFactory = await ethers.getContractFactory("VAULTMock");
        const vault = await VAULTFactory.deploy();
        await vault.waitForDeployment();
        
        // Deploy USDV mock
        const USDVFactory = await ethers.getContractFactory("USDVMock");
        const usdv = await USDVFactory.deploy();
        await usdv.waitForDeployment();
        
        // Deploy DAO
        const DAOFactory = await ethers.getContractFactory("DAO");
        const dao = await DAOFactory.deploy();
        await dao.waitForDeployment();
        
        // Initialize DAO
        await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
        
        // Setup: Give some weight to owner for voting
        await vault.setMemberWeight(owner.address, 1000);
        await vault.setTotalWeight(3000);
        
        // Create a "DAO" type proposal (not GRANT, UTILS, or REWARD)
        await dao.newAddressProposal(addr1.address, "DAO");
        
        // Vote on the proposal to get quorum (need > 1/3 of total weight)
        await dao.voteProposal(1);
        
        // Fast forward past coolOffPeriod (coolOffPeriod = 1 second)
        await ethers.provider.send("evm_increaseTime", [2]);
        await ethers.provider.send("evm_mine", []);
        
        // Capture the current reward address before finalising
        const rewardAddressBefore = await vader.rewardAddress();
        
        // Finalise the proposal
        await dao.finaliseProposal(1);
        
        // Check that reward address was NOT changed (original behavior)
        // Mutant would incorrectly change it, so this assertion would fail
        const rewardAddressAfter = await vader.rewardAddress();
        expect(rewardAddressAfter).to.equal(rewardAddressBefore, "Reward address should not change for DAO type proposal");
    });
});