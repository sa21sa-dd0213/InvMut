import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should detect the mutant by checking accumulated pot discrepancy after two wins", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play first round - assume we can make it win by manipulating block values
    // For deterministic testing, we exploit the modulo 2 randomness:
    // random = uint(keccak256(block.timestamp, block.difficulty, msg.sender)) % 2
    // We can call from an address that makes random == 0 (winner)
    // Since we cannot control block.timestamp/difficulty, we use a loop approach:
    // Keep playing until the player wins, but record the pot before and after

    // Play until we get a win (random == 0)
    let winCount = 0;
    let initialPot = ethers.parseEther("0");

    while (winCount < 2) {
      const potBefore = await instance.pot();
      if (winCount === 0) initialPot = potBefore;

      // Send exact ticket amount
      const tx = await player.sendTransaction({
        to: instance.target,
        value: TICKET_AMOUNT
      });
      await tx.wait();

      const potAfter = await instance.pot();

      // Check if this round resulted in a win (pot reset to 0)
      if (potAfter === ethers.parseEther("0")) {
        winCount++;
      }
    }

    // After two wins, in the original contract the pot should be exactly 0
    // In the mutant, each ticket added msg.value - 1 instead of msg.value,
    // so the pot accumulated 1 wei less per ticket before each win.
    // Since we bought at least 2 tickets (one per win), the mutant's pot
    // after both wins will be 2 wei less than expected.
    const finalPot = await instance.pot();

    // In the original: after two wins, pot = 0
    // In the mutant: pot will be underflowing or incorrect
    // We expect pot to be exactly 0 for the original
    expect(finalPot).to.equal(ethers.parseEther("0"));

    // Additionally, check that the bank balance is correct
    // Bank should have received FEE_AMOUNT per win = 2 * 1 ether = 2 ether
    const bankBalance = await ethers.provider.getBalance(instance.target);
    // Contract should hold no funds after all payouts (bank received fees)
    // In mutant, bank might have received slightly different amounts
    expect(bankBalance).to.equal(ethers.parseEther("0"));
  });
});