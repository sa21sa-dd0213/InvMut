import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m1d8fbde5 - grantFunds 10% cap removal", function () {
  it("should revert when grant amount exceeds 10% of vault USDV balance, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts for VADER, USDV, and VAULT
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

    // Setup: mint USDV to vault and set total weight for quorum
    const vaultAddress = await vault.getAddress();
    await usdv.mint(vaultAddress, ethers.parseEther("1000"));

    // Set vault total weight to enable quorum
    await vault.setTotalWeight(ethers.parseEther("100"));

    // Create a grant proposal with amount > 10% of vault's USDV balance (10% = 100 USDV)
    const grantAmount = ethers.parseEther("200"); // 20% of vault balance
    await dao.newGrantProposal(addr1.address, grantAmount);

    // Vote on proposal to trigger finalising (need quorum: > 1/3 of total weight)
    // Set member weight for owner
    await vault.setMemberWeight(owner.address, ethers.parseEther("40"));
    await dao.connect(owner).voteProposal(1);

    // Wait for coolOffPeriod to pass
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to finalise - original contract would revert because amount > 10%
    // Mutant should allow this to succeed
    await dao.connect(owner).finaliseProposal(1);

    // Verify that the grant was executed (mutant behaviour)
    const vaultUSDVBalance = await usdv.balanceOf(vaultAddress);
    expect(vaultUSDVBalance).to.be.lt(ethers.parseEther("1000")); // USDV was transferred out

    // Check recipient received funds
    const recipientBalance = await usdv.balanceOf(addr1.address);
    expect(recipientBalance).to.equal(grantAmount);
  });
});