import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m85589f5e test", function () {
  it("should detect mutant that changes division to subtraction in grantFunds", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts for VADER, USDV, and VAULT
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const MockVAULT = await ethers.getContractFactory("MockVAULT");

    const usdv = await MockERC20.deploy("USDV", "USDV", 18);
    await usdv.waitForDeployment();

    const vader = await MockVADER.deploy();
    await vader.waitForDeployment();

    const vault = await MockVAULT.deploy();
    await vault.waitForDeployment();

    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());

    // Setup: Fund vault with USDV
    const vaultAmount = ethers.parseEther("1000");
    await usdv.mint(await vault.getAddress(), vaultAmount);

    // Set vault's totalWeight to enable quorum/majority checks
    await vault.setTotalWeight(ethers.parseEther("1000"));

    // Create a grant proposal with amount equal to exactly 10% of vault balance
    const grantAmount = ethers.parseEther("100"); // 10% of 1000

    await dao.newGrantProposal(addr1.address, grantAmount);

    // Get proposal ID (should be 1)
    const proposalId = 1;

    // Vote on the proposal to start finalising process
    await dao.connect(addr1).voteProposal(proposalId);

    // Fast forward past coolOffPeriod
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Try to finalise - this should succeed on original but fail on mutant
    // because mutant checks amount <= balance - 10 instead of amount <= balance / 10
    // With balance = 1000, original: 100 <= 1000/10 = 100 (passes)
    // Mutant: 100 <= 1000 - 10 = 990 (passes, but different threshold)

    // To kill the mutant, we need a case where original passes but mutant fails
    // Let's use amount = 10% of balance when balance is small enough that subtraction gives lower value
    // Example: balance = 20, 10% = 2, original: 2 <= 20/10 = 2 (passes)
    // Mutant: 2 <= 20 - 10 = 10 (passes) - still passes

    // Actually, the key difference: with large balances, mutant allows much larger grants
    // Let's test with amount = 500 (50% of 1000)
    // Original: 500 <= 100 (fails) - reverts
    // Mutant: 500 <= 990 (passes) - would succeed

    // To kill the mutant, test that original would revert for amount > 10%
    const grantAmount2 = ethers.parseEther("500"); // 50% of vault balance

    await dao.newGrantProposal(addr2.address, grantAmount2);
    const proposalId2 = 2;

    await dao.connect(addr1).voteProposal(proposalId2);

    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // On original: should revert because 500 > 100 (10% of 1000)
    // On mutant: should succeed because 500 <= 990 (1000 - 10)
    // The mutant allows the transaction to go through, so expect revert to detect mutant
    await expect(
      dao.finaliseProposal(proposalId2)
    ).to.be.revertedWith("Not more than 10%");
  });
});