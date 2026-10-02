import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant kill test - hasMinority", function () {
  it("should revert when cancelProposal is called with a new proposal that lacks minority support", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts for VADER, USDV, and VAULT
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const MockVAULT = await ethers.getContractFactory("MockVAULT");

    const mockUSDV = await MockERC20.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();

    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();

    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();

    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());

    // Create an old proposal that is in finalising state
    await dao.newAddressProposal(addr1.address, "DAO");

    // Vote on the proposal to give it enough votes to be finalised
    // We need to make it finalising first
    await dao.connect(addr1).voteProposal(1);

    // Now create a new proposal with very few votes (below minority threshold)
    await dao.connect(addr2).newAddressProposal(addr2.address, "DAO");

    // Vote on the new proposal with minimal weight (simulating low support)
    // The VAULT's totalWeight() returns 0, so minority threshold is 0/6 = 0
    // hasMinority checks if votes > 0, which is false when votes = 0
    // But in the mutant it always returns true, so cancellation would succeed incorrectly

    // Attempt to cancel proposal 1 using proposal 2 as the new proposal
    // This should revert in the original because hasMinority(2) returns false (0 votes)
    await expect(
      dao.connect(addr1).cancelProposal(1, 2)
    ).to.be.revertedWith("Must have minority");
  });
});