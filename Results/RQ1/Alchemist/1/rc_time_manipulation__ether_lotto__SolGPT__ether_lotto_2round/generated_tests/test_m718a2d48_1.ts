import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - m718a2d48", function () {
  it("should detect mutant that adds +1 to pot accumulation by comparing payout amounts", async function () {
    const [owner, player1, player2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play first round: send 10 ether, lose (random == 1 so pot accumulates)
    // We need to ensure we get random == 1. Since the random depends on block.timestamp,
    // block.difficulty, and msg.sender, we can try different senders or manipulate
    // the block timestamp. For simplicity, we play with player1 first, and if it wins,
    // we play again with different block parameters. We'll use a loop to guarantee
    // a losing round then a winning round.
    let round1Lost = false;
    let round2Won = false;
    let attempts = 0;

    while (!round1Lost || !round2Won) {
      const signer = attempts % 2 === 0 ? player1 : player2;
      const tx = await instance.connect(signer).play({ value: TICKET_AMOUNT });
      const receipt = await tx.wait();

      // Check if this round was a loss (pot > 0 means it wasn't paid out)
      const potAfter = await instance.pot();
      if (!round1Lost && potAfter > 0n) {
        round1Lost = true;
        // Mine a new block to change block.timestamp for next attempt
        await ethers.provider.send("evm_mine", []);
      } else if (round1Lost && potAfter === 0n) {
        round2Won = true;
        // Get the balance of the winner before payout
        const winnerBalanceBefore = await ethers.provider.getBalance(signer.address);
        // The payout should be: pot (which was 10 ether from round1) + 10 ether from round2 - 1 ether fee = 19 ether
        // In mutant: pot would be 11 ether from round1 + 11 ether from round2 - 1 ether fee = 21 ether
        // But since pot resets to 0, the transfer amount is (pot - FEE_AMOUNT) where pot was the accumulated pot
        // For original: pot after round1 = 10, after round2 = 20, payout = 20 - 1 = 19
        // For mutant: pot after round1 = 11, after round2 = 22, payout = 22 - 1 = 21
        const expectedPayoutOriginal = TICKET_AMOUNT * 2n - FEE_AMOUNT; // 19 ether
        const balanceChange = await ethers.provider.getBalance(signer.address) - winnerBalanceBefore;
        // The actual balance change includes the refund of the ticket amount plus the pot payout
        // But the play function sends (pot - FEE_AMOUNT) to the winner, and the pot is reset
        // The winner's net change = -TICKET_AMOUNT (they paid) + (pot_before_payout - FEE_AMOUNT)
        // pot_before_payout = accumulated pot (20 original, 22 mutant)
        // Net change original: -10 + (20 - 1) = 9
        // Net change mutant: -10 + (22 - 1) = 11
        const expectedNetChangeOriginal = TICKET_AMOUNT * 2n - FEE_AMOUNT - TICKET_AMOUNT; // 9 ether
        expect(balanceChange).to.equal(expectedNetChangeOriginal);
        break;
      }
      attempts++;
      if (attempts > 20) {
        // Force a specific outcome by using different senders and mining blocks
        await ethers.provider.send("evm_mine", []);
      }
    }
  });
});