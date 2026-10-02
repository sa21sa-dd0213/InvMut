import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m1f71002b", function () {
  it("should kill the mutant by showing that randomness source change affects outcome", async function () {
    const [owner, player] = await ethers.getSigners();
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Record initial balances
    const initialBankBalance = await ethers.provider.getBalance(owner.address);
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);

    // Player calls play() with exactly TICKET_AMOUNT
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt = await tx.wait();

    // In the original contract with block.difficulty (always 0), random == 0 always,
    // so bank gets FEE_AMOUNT and player gets pot - FEE_AMOUNT.
    // With block.prevrandao (random), outcome varies.
    // To kill the mutant, we verify that the outcome is NOT deterministic:
    // The player should NOT always lose (i.e., bank should not always win FEE_AMOUNT)
    // We check that player's balance changed by something other than (pot - FEE_AMOUNT) - TICKET_AMOUNT
    // or that bank's balance changed by something other than FEE_AMOUNT

    const finalBankBalance = await ethers.provider.getBalance(owner.address);
    const finalPlayerBalance = await ethers.provider.getBalance(player.address);

    const bankDelta = finalBankBalance - initialBankBalance;
    const playerDelta = finalPlayerBalance - initialPlayerBalance;

    // If random == 0 (original behavior), bank gains FEE_AMOUNT, player gains (TICKET_AMOUNT - FEE_AMOUNT)
    // If random == 1 (mutant could produce this), bank gains nothing, player gains TICKET_AMOUNT
    // The mutant is killed if the outcome is NOT the deterministic original outcome
    // We assert that it's NOT the case that bank gained exactly FEE_AMOUNT and player gained exactly (TICKET_AMOUNT - FEE_AMOUNT)
    const expectedBankGain = FEE_AMOUNT;
    const expectedPlayerGain = TICKET_AMOUNT - FEE_AMOUNT;

    // If this assertion passes, the mutant is killed because the outcome differs from original
    // If this assertion fails, the outcome matched the original (but with block.prevrandao it's extremely unlikely)
    expect(bankDelta).to.not.equal(expectedBankGain);
    expect(playerDelta).to.not.equal(expectedPlayerGain);
  });
});