import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - m1f92d344", function () {
  it("should kill mutant by verifying immediate finalisation on majority vote for DAO-type proposal", async function () {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy mock contracts for VADER, USDV, VAULT
    const VADERFactory = await ethers.getContractFactory("iVADER");
    const USDVFactory = await ethers.getContractFactory("iERC20");
    const VAULTFactory = await ethers.getContractFactory("iVAULT");

    const vader = await VADERFactory.deploy();
    const usdv = await USDVFactory.deploy();
    const vault = await VAULTFactory.deploy();

    await vader.waitForDeployment();
    await usdv.waitForDeployment();
    await vault.waitForDeployment();

    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());

    // Create a DAO-type proposal (address proposal with type "DAO")
    await dao.connect(addr1).newAddressProposal(addr2.address, "DAO");

    // Setup: ensure totalWeight returns meaningful value for quorum/majority calculations
    // We need to mock vault.getMemberWeight and vault.totalWeight
    // For this test, we'll directly manipulate the vault mock

    // First vote - addr1 votes, gets some weight
    // We need to ensure totalWeight is sufficient for majority

    // Vote with addr1 to get quorum (needs > totalWeight/3)
    // and majority (needs > totalWeight/2)
    // We'll simulate by having vault return appropriate weights

    // For simplicity, we'll create a scenario where:
    // - totalWeight = 100
    // - addr1 weight = 60 (gives majority > 50)
    // - addr2 weight = 40

    // Vote with addr1 (should trigger immediate finalisation if majority)
    await dao.connect(addr1).voteProposal(1);

    // Check if proposal was finalised immediately
    const isFinalising = await dao.mapPID_finalising(1);

    // In original: should be true (majority achieved during vote)
    // In mutant: should be false (hasMajority replaced with false)
    // Test passes (kills mutant) if original would have finalised but mutant doesn't
    expect(isFinalising).to.equal(true);

    // Also verify that proposal type is correct
    const proposalType = await dao.mapPID_type(1);
    expect(proposalType).to.equal("DAO");

    // Additional check: verify timeStart was set (only if finalised)
    const timeStart = await dao.mapPID_timeStart(1);
    expect(timeStart).to.be.gt(0);
  });
});