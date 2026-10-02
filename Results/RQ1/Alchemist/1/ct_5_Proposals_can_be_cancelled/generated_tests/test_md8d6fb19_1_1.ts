import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - finaliseProposal requires != true instead of == true", function () {
  it("should revert when calling finaliseProposal on a proposal that IS in finalising state (mutant expects NOT finalising)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock VADER, USDV, and VAULT contracts for DAO constructor
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const MockVADERFactory = await ethers.getContractFactory("MockVADER");
    const MockVAULTFactory = await ethers.getContractFactory("MockVAULT");

    const mockVADER = await MockVADERFactory.deploy();
    await mockVADER.waitForDeployment();

    const mockUSDV = await MockERC20Factory.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();

    const mockVAULT = await MockVAULTFactory.deploy();
    await mockVAULT.waitForDeployment();

    // Deploy DAO with constructor arguments
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());

    // Create a grant proposal (any proposal type works for testing finaliseProposal)
    await dao.newGrantProposal(addr1.address, ethers.parseEther("100"));

    // Vote on the proposal to trigger _finalise (sets mapPID_finalising to true)
    // First we need to set up vault to return some weight for the voter
    // Mock VAULT getMemberWeight returns 100
    await dao.connect(owner).voteProposal(1);

    // Now proposal 1 should be in finalising state (mapPID_finalising[1] == true)
    // The original requires == true, the mutant requires != true
    // So calling finaliseProposal on the mutant should revert because mapPID_finalising[1] IS true
    await expect(
      dao.connect(owner).finaliseProposal(1)
    ).to.be.revertedWith("Must be finalising");
  });
});