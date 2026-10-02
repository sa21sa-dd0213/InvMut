import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant kill test - voteProposal >= false mutation", function () {
  it("should revert when voting on an already finalising proposal (mutant allows double finalisation)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts for VADER, USDV, and VAULT interfaces
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

    // Create a grant proposal
    await dao.connect(addr1).newGrantProposal(addr2.address, ethers.parseEther("100"));

    // Setup mock VAULT to return sufficient weight for quorum and majority
    // First vote - this will trigger finalisation since quorum is met
    await mockVAULT.setMemberWeight(addr1.address, ethers.parseEther("1000"));
    await mockVAULT.setTotalWeight(ethers.parseEther("2000"));

    // Vote on proposal 1 - should finalise it (quorum = > 666, majority = > 1000, with 1000 weight)
    await dao.connect(addr1).voteProposal(1);

    // Now try to vote again on the same proposal - original should revert because already finalising
    // Mutant would allow it because >= false is always true
    await expect(
      dao.connect(addr1).voteProposal(1)
    ).to.be.reverted;
  });
});