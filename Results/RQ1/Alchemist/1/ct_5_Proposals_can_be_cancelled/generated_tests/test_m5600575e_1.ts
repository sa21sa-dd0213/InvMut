import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DAO mutant m5600575e - voteProposal else branch removal", function () {
    it("should revert when trying to finalise a GRANT proposal that reached quorum but not majority, because the mutant removes auto-finalisation in voteProposal", async function () {
        const [owner, addr1, addr2, addr3] = await ethers.getSigners();
        
        // Deploy mock VADER, USDV, and VAULT contracts (simplified for testing)
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        const mockUSDV = await MockERC20Factory.deploy("USDV", "USDV", 18);
        await mockUSDV.waitForDeployment();
        
        const MockVADERFactory = await ethers.getContractFactory("MockVADER");
        const mockVADER = await MockVADERFactory.deploy();
        await mockVADER.waitForDeployment();
        
        const MockVAULTFactory = await ethers.getContractFactory("MockVAULT");
        const mockVAULT = await MockVAULTFactory.deploy();
        await mockVAULT.waitForDeployment();
        
        // Deploy DAO
        const DAOFactory = await ethers.getContractFactory("DAO");
        const dao = await DAOFactory.deploy();
        await dao.waitForDeployment();
        
        // Initialize DAO
        await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());
        
        // Setup vault weights for quorum (1/3) but not majority (1/2)
        // totalWeight = 100, quorum = 33, majority = 50
        await mockVAULT.setTotalWeight(100);
        await mockVAULT.setMemberWeight(addr1.address, 40); // 40 > 33 (quorum), 40 < 50 (not majority)
        
        // Create a GRANT proposal
        await dao.connect(addr1).newGrantProposal(addr2.address, ethers.parseEther("100"));
        const proposalId = 1;
        
        // Vote on the proposal - this should trigger auto-finalisation in original, but not in mutant
        await dao.connect(addr1).voteProposal(proposalId);
        
        // In the mutant, the proposal was NOT finalised during voteProposal
        // So calling finaliseProposal should revert because it's not in finalising state
        await expect(
            dao.connect(addr1).finaliseProposal(proposalId)
        ).to.be.revertedWith("Must be finalising");
    });
});