import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant kill test - m7db94142 (block.prevrandao instead of block.timestamp)", function () {
    it("should detect block.prevrandao mutation in _finalise event emission", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy mock VADER, USDV, and VAULT contracts first
        const DAOFactory = await ethers.getContractFactory("DAO");
        const dao = await DAOFactory.deploy();
        await dao.waitForDeployment();
        
        // Deploy minimal mock contracts for VADER, USDV, VAULT
        const MockVADERFactory = await ethers.getContractFactory("MockVADER");
        const mockVADER = await MockVADERFactory.deploy();
        await mockVADER.waitForDeployment();
        
        const MockUSDVFactory = await ethers.getContractFactory("MockUSDV");
        const mockUSDV = await MockUSDVFactory.deploy();
        await mockUSDV.waitForDeployment();
        
        const MockVAULTFactory = await ethers.getContractFactory("MockVAULT");
        const mockVAULT = await MockVAULTFactory.deploy();
        await mockVAULT.waitForDeployment();
        
        // Initialize DAO
        await dao.init(
            await mockVADER.getAddress(),
            await mockUSDV.getAddress(),
            await mockVAULT.getAddress()
        );
        
        // Create a grant proposal (or any proposal that will trigger _finalise)
        await dao.newAddressProposal(addr1.address, "DAO");
        
        // Get proposal ID (should be 1)
        const proposalID = 1;
        
        // Simulate voting to reach quorum (needs > totalWeight/3)
        await mockVAULT.setMemberWeight(owner.address, 40);
        await mockVAULT.setTotalWeight(100);
        
        // Vote on the proposal - this should trigger _finalise if quorum reached
        const tx = await dao.connect(owner).voteProposal(proposalID);
        const receipt = await tx.wait();
        
        // Get the block timestamp from the transaction
        const block = await ethers.provider.getBlock(receipt.blockNumber);
        const blockTimestamp = block.timestamp;
        
        // Find the ProposalFinalising event
        const event = receipt.logs.find((log) => {
            try {
                const parsedLog = dao.interface.parseLog(log);
                return parsedLog.name === "ProposalFinalising";
            } catch {
                return false;
            }
        });
        
        // Parse the event
        const parsedEvent = dao.interface.parseLog({
            topics: event.topics,
            data: event.data
        });
        
        // The third argument is timeFinalised = block.timestamp + coolOffPeriod
        const expectedTime = blockTimestamp + 1;
        const actualTime = parsedEvent.args.timeFinalised;
        
        // If mutation is present, actualTime will be block.prevrandao + 1
        // which is NOT equal to block.timestamp + 1
        expect(actualTime).to.equal(
            expectedTime,
            "TimeFinalised should be block.timestamp + coolOffPeriod, not block.prevrandao + coolOffPeriod"
        );
    });
});