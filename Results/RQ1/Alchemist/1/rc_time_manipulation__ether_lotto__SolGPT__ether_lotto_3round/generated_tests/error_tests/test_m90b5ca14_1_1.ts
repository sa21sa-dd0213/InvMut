import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m90b5ca14 test", function () {
  it("should detect the mutant that adds 1 extra wei to pot when random != 0", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = 10n; // TICKET_AMOUNT = 10 wei
    const feeAmount = 1n; // FEE_AMOUNT = 1 wei

    // Play with exactly 10 wei - we need the random result to be 1 (no payout)
    // Since we can't control randomness, we play multiple times until we get a losing round
    for (let i = 0; i < 20; i++) {
      const potBefore = await instance.pot();
      
      await player.sendTransaction({
        to: await instance.getAddress(),
        value: ticketAmount
      });
      
      // Wait for the transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const potAfter = await instance.pot();
      
      // If random was 1 (no winner), pot should be reset to 0 in both original and mutant
      // But in the mutant, the pot was increased by 11 instead of 10 before the check
      if (potAfter === 0n) {
        // This means random was 0 (winner paid out) - skip this iteration
        continue;
      }
      
      // Random was 1 (no winner) - pot should be ticketAmount (10) in original
      // In mutant it would be 11 (10 + 1 extra from the mutation)
      expect(potAfter).to.equal(ticketAmount);
      break;
    }
  });
});