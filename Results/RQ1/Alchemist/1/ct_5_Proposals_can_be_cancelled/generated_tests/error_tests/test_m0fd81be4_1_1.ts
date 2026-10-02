import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - m0fd81be4", function () {
    it("should not re-finalise a proposal that already has quorum when calling finaliseProposal", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy mock VADER and VAULT contracts (minimal implementations for testing)
        const MockVADER = await ethers.getContractFactory("MockVADER");
        const mockVADER = await MockVADER.deploy();
        await mockVADER.waitForDeployment();

        const MockVAULT = await ethers.getContractFactory("MockVAULT");
        const mockVAULT = await MockVAULT.deploy();
        await mockVAULT.waitForDeployment();

        const MockUSDV = await ethers.getContractFactory("MockUSDV");
        const mockUSDV = await MockUSDV.deploy();
        await mockUSDV.waitForDeployment();

        // Deploy DAO
        const Factory = await ethers.getContractFactory("DAO");
        const dao = await Factory.deploy();
        await dao.waitForDeployment();

        // Initialize DAO
        await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());

        // Create a grant proposal
        const recipient = addr2.address;
        const amount = ethers.parseEther("100");
        await dao.newGrantProposal(recipient, amount);

        // Simulate voting to get quorum (need > 1/3 of total weight)
        // Mock VAULT returns weight for each voter - we need to set up weights
        // For simplicity, we'll use a scenario where totalWeight = 100, quorum requires > 33
        await mockVAULT.setMemberWeight(owner.address, 40);
        await mockVAULT.setTotalWeight(100);

        // Vote on proposal to achieve quorum
        await dao.voteProposal(1);

        // Now finalise the proposal (this sets it to finalising state)
        // Check the state
        let isFinalising = await dao.mapPID_finalising(1);
        expect(isFinalising).to.be.true;

        // Get the timeStart
        let timeStart = await dao.mapPID_timeStart(1);

        // Advance time past coolOffPeriod (coolOffPeriod = 1 second)
        await ethers.provider.send("evm_increaseTime", [2]);
        await ethers.provider.send("evm_mine", []);

        // Now call finaliseProposal - in the original, since we have quorum, it should NOT re-finalise
        // In the mutant, it WILL re-finalise because !hasQuorum is replaced with true
        // We can detect this by checking if the timeStart changed (indicating re-finalisation)
        await dao.finaliseProposal(1);

        let newTimeStart = await dao.mapPID_timeStart(1);

        // If the mutant is present, timeStart would have been updated (increased)
        // If original, timeStart should remain the same
        expect(newTimeStart).to.equal(timeStart, "timeStart should not change if quorum is already met");
    });
});