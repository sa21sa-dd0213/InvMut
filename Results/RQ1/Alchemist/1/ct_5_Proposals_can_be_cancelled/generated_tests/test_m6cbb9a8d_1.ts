import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant detection - m6cbb9a8d", function () {
  it("should detect the cool-off period bypass by calling finaliseProposal before cool-off ends", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock VADER
    const VADERFactory = await ethers.getContractFactory("MockVADER");
    const vader = await VADERFactory.deploy();
    await vader.waitForDeployment();

    // Deploy mock USDV
    const USDVFactory = await ethers.getContractFactory("MockERC20");
    const usdv = await USDVFactory.deploy("USDV", "USDV", 18);
    await usdv.waitForDeployment();

    // Deploy mock VAULT
    const VAULTFactory = await ethers.getContractFactory("MockVAULT");
    const vault = await VAULTFactory.deploy();
    await vault.waitForDeployment();

    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());

    // Create a grant proposal
    await dao.connect(addr1).newGrantProposal(addr2.address, ethers.parseEther("100"));
    
    // Vote on proposal to trigger finalising
    await dao.connect(addr1).voteProposal(1);
    
    // Attempt to finalise immediately (before cool-off period of 1 second)
    await expect(
      dao.connect(addr1).finaliseProposal(1)
    ).to.be.revertedWith("Must be after cool off");
  });
});