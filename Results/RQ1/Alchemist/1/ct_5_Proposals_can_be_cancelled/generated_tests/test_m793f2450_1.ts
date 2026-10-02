import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant kill test - m793f2450", function () {
    it("should emit NewVote event when voteProposal is called", async function () {
        const [owner, voter1] = await ethers.getSigners();
        
        // Deploy mock contracts for interfaces
        const MockVADER = await ethers.getContractFactory("MockVADER");
        const MockVAULT = await ethers.getContractFactory("MockVAULT");
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        
        const mockVADER = await MockVADER.deploy();
        await mockVADER.waitForDeployment();
        
        const mockUSDV = await MockERC20.deploy("USDV", "USDV", 18);
        await mockUSDV.waitForDeployment();
        
        const mockVAULT = await MockVAULT.deploy();
        await mockVAULT.waitForDeployment();
        
        // Deploy DAO
        const DAO = await ethers.getContractFactory("DAO");
        const dao = await DAO.deploy();
        await dao.waitForDeployment();
        
        // Initialize DAO
        await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());
        
        // Create a new grant proposal first
        const recipient = addr1?.address || ethers.Wallet.createRandom().address;
        const amount = ethers.parseEther("100");
        await dao.newGrantProposal(recipient, amount);
        
        // Setup mock VAULT to return a weight for the voter
        const voterWeight = ethers.parseEther("100");
        await mockVAULT.setMemberWeight(voter1.address, voterWeight);
        await mockVAULT.setTotalWeight(ethers.parseEther("1000"));
        
        // Vote on proposal 1 and expect NewVote event
        await expect(dao.connect(voter1).voteProposal(1))
            .to.emit(dao, "NewVote")
            .withArgs(
                voter1.address,
                1,
                voterWeight,
                ethers.parseEther("100"), // total votes after this vote
                "GRANT"
            );
    });
});