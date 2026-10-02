import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant detection - isEqual >= replacement", function () {
  it("should revert when cancelling a proposal with different types (GRANT vs UTILS) due to strict equality check", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock contracts for VADER, USDV, and VAULT interfaces
    const VADERFactory = await ethers.getContractFactory("iVADER");
    const USDVFactory = await ethers.getContractFactory("iERC20");
    const VAULTFactory = await ethers.getContractFactory("iVAULT");

    const vader = await VADERFactory.deploy();
    await vader.waitForDeployment();
    const usdv = await USDVFactory.deploy();
    await usdv.waitForDeployment();
    const vault = await VAULTFactory.deploy();
    await vault.waitForDeployment();

    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());

    // Create a GRANT proposal
    await dao.newGrantProposal(addr1.address, ethers.parseEther("100"));

    // Create a UTILS proposal
    await dao.newAddressProposal(addr1.address, "UTILS");

    // Get proposal IDs (1 and 2)
    // Try to cancel proposal 1 (GRANT) using proposal 2 (UTILS) as new proposal
    // This should revert because types are different (GRANT vs UTILS)
    // The original contract uses strict equality (==) and should revert
    // The mutant uses >= and may incorrectly allow the cancellation

    await expect(
      dao.cancelProposal(1, 2)
    ).to.be.revertedWith("Must be same");
  });
});