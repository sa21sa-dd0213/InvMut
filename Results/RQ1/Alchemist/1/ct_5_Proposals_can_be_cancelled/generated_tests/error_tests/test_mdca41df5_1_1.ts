import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO - kill mutant mdca41df5 (cancelProposal event emission)", function () {
  it("should emit CancelProposal event when cancelProposal is called with valid parameters", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts for VADER, USDV, VAULT interfaces
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const MockUSDV = await ethers.getContractFactory("MockUSDV");
    const MockVAULT = await ethers.getContractFactory("MockVAULT");

    const mockVADER = await MockVADER.deploy();
    const mockUSDV = await MockUSDV.deploy();
    const mockVAULT = await MockVAULT.deploy();

    await mockVADER.waitForDeployment();
    await mockUSDV.waitForDeployment();
    await mockVAULT.waitForDeployment();

    // Deploy DAO
    const DAO = await ethers.getContractFactory("DAO");
    const dao = await DAO.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());

    // Create an address proposal (old proposal to be cancelled)
    await dao.newAddressProposal(addr1.address, "UTILS");
    const oldProposalId = 1;

    // Create another proposal of same type (new proposal)
    await dao.newAddressProposal(addr2.address, "UTILS");
    const newProposalId = 2;

    // Vote on old proposal to make it finalising
    await dao.voteProposal(oldProposalId);

    // Set up mock VAULT to return sufficient totalWeight for minority check
    // We need to ensure newProposal has minority (votes > totalWeight/6)
    // For simplicity, vote on new proposal too
    await dao.voteProposal(newProposalId);

    // Now call cancelProposal and expect event emission
    await expect(dao.cancelProposal(oldProposalId, newProposalId))
      .to.emit(dao, "CancelProposal")
      .withArgs(
        owner.address,
        oldProposalId,
        0, // mapPID_votes[oldProposalId] is set to 0 in the function
        ethers.anyValue, // mapPID_votes[newProposalId]
        ethers.anyValue  // iVAULT(VAULT).totalWeight()
      );
  });
});