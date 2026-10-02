import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant mf09b6e16 test", function () {
  it("should kill mutant by showing GRANT proposal with quorum but no majority should finalise during voteProposal", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts for VADER, USDV, and VAULT
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const MockVADERFactory = await ethers.getContractFactory("MockVADER");
    const MockVAULTFactory = await ethers.getContractFactory("MockVAULT");

    const mockUSDV = await MockERC20Factory.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();

    const mockVADER = await MockVADERFactory.deploy();
    await mockVADER.waitForDeployment();

    const mockVAULT = await MockVAULTFactory.deploy();
    await mockVAULT.waitForDeployment();

    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());

    // Setup mock VAULT to return totalWeight = 100
    await mockVAULT.setTotalWeight(100);

    // Create a GRANT proposal
    const recipient = addr1.address;
    const amount = ethers.parseEther("10");
    await dao.newGrantProposal(recipient, amount);

    // Proposal ID should be 1
    const proposalID = 1;

    // Setup member weight for addr2 to be 40 (above quorum of 33.33 but below majority of 50)
    await mockVAULT.setMemberWeight(addr2.address, 40);

    // Vote on the proposal with addr2
    await dao.connect(addr2).voteProposal(proposalID);

    // Check if the proposal was finalised (mapPID_finalising should be true for GRANT with quorum)
    const isFinalising = await dao.mapPID_finalising(proposalID);

    // In original: GRANT proposal with quorum should be finalised (true)
    // In mutant: GRANT proposal with quorum but no majority would NOT be finalised (false)
    expect(isFinalising).to.equal(true);
  });
});