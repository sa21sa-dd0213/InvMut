import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant mb4f568f3 - finaliseProposal time check", function () {
  it("should revert when finaliseProposal is called before cool-off period elapses (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock VADER, USDV, and VAULT contracts
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const MockVAULT = await ethers.getContractFactory("MockVAULT");

    const vader = await MockVADER.deploy();
    const usdv = await MockERC20.deploy("USDV", "USDV", 18);
    const vault = await MockVAULT.deploy();

    await vader.waitForDeployment();
    await usdv.waitForDeployment();
    await vault.waitForDeployment();

    // Deploy DAO
    const DAO = await ethers.getContractFactory("DAO");
    const dao = await DAO.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());

    // Create a new grant proposal
    await dao.newGrantProposal(addr1.address, ethers.parseEther("100"));

    // Vote on proposal to trigger finalising state
    await dao.connect(addr1).voteProposal(1);

    // Try to finalise immediately (before cool-off period of 1 second)
    await expect(
      dao.connect(addr1).finaliseProposal(1)
    ).to.be.revertedWith("Must be after cool off");
  });
});