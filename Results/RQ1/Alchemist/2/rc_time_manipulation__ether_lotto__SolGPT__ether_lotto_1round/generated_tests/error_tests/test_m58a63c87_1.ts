import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m58a63c87 detection", function () {
  it("should detect mutant by verifying behavior difference when block.difficulty is 0 vs block.prevrandao is non-zero", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Get initial balances
    const initialBankBalance = await ethers.provider.getBalance(owner.address);
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);

    // Play the lottery
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt = await tx.wait();

    // Get final balances
    const finalBankBalance = await ethers.provider.getBalance(owner.address);
    const finalPlayerBalance = await ethers.provider.getBalance(player.address);

    // In a post-Merge environment, block.difficulty is always 0
    // This means original code always sets random = 0 (bank wins)
    // Expected: bank gets FEE + (pot - FEE) = pot = TICKET_AMOUNT
    // Player gets nothing back (except gas)
    const expectedBankGain = TICKET_AMOUNT;
    expect(finalBankBalance - initialBankBalance).to.equal(expectedBankGain);
    
    // Player should have lost the full ticket amount (minus gas)
    // Player's balance change should be negative TICKET_AMOUNT (plus gas costs)
    const playerLoss = initialPlayerBalance - finalPlayerBalance;
    expect(playerLoss).to.be.gte(TICKET_AMOUNT);
    
    // Verify pot is reset to 0 after the play
    const potAfter = await instance.pot();
    expect(potAfter).to.equal(0);
  });
});