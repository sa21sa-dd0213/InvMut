import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m8d9900cd - cancelProposal type check", function () {
  it("should revert when cancelling a proposal with a different type than the new proposal", async function () {
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

    // Create a GRANT proposal (proposal ID 1)
    await dao.newGrantProposal(addr1.address, ethers.parseEther("100"));

    // Create a UTILS proposal (proposal ID 2) - different type
    await dao.newAddressProposal(addr2.address, "UTILS");

    // Vote on proposal 2 to make it have minority (need > totalWeight/6 votes)
    // Mock totalWeight to return a known value
    await mockVAULT.setTotalWeight(ethers.parseEther("100"));

    // Vote on proposal 2 to give it enough votes for minority
    await dao.connect(addr1).voteProposal(2);

    // Try to cancel proposal 1 (GRANT) using proposal 2 (UTILS) - should revert because types don't match
    await expect(
      dao.cancelProposal(1, 2)
    ).to.be.revertedWith("Must be same");
  });
});