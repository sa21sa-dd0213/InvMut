import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m0f80498e test", function () {
  it("should detect the mutant where pot += msg.value-1 instead of pot += msg.value", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n; // 10 wei

    // Player sends exactly 10 wei and loses (random == 1)
    // We can't control randomness, but we can play multiple times until we get a losing round
    // For deterministic testing, we'll play and check pot after each round

    // Play until we get a losing round (random == 1)
    let potAfterPlay: bigint;
    let round = 0;
    const maxRounds = 10;

    do {
      const tx = await player.sendTransaction({
        to: await instance.getAddress(),
        value: TICKET_AMOUNT
      });
      await tx.wait();

      potAfterPlay = await instance.pot();
      round++;

      if (round > maxRounds) {
        // If all rounds were winning (unlikely but possible), just check the last pot
        break;
      }
    } while (potAfterPlay !== 0n); // pot = 0 means a winning round (payout happened)

    // After a losing round, pot should be exactly 10 wei (the full ticket amount)
    // In the mutant, pot would be 9 wei (msg.value - 1)
    // If we got a winning round, pot will be 0, so we need to check after a losing round
    if (potAfterPlay !== 0n) {
      // We had a losing round - pot should equal TICKET_AMOUNT
      expect(potAfterPlay).to.equal(TICKET_AMOUNT);
    }

    // Additional check: play a second time to verify cumulative effect
    const secondTx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: TICKET_AMOUNT
    });
    await secondTx.wait();

    const potAfterSecondPlay = await instance.pot();

    // If first round was winning (pot reset to 0), second losing round should show pot = 10
    // If first round was losing (pot = 10), second losing round should show pot = 20
    if (potAfterPlay === 0n) {
      // First was winning, second was losing
      if (potAfterSecondPlay !== 0n) {
        expect(potAfterSecondPlay).to.equal(TICKET_AMOUNT);
      }
    } else {
      // First was losing, second might be losing or winning
      if (potAfterSecondPlay !== 0n) {
        // Both losing - pot should be 2 * TICKET_AMOUNT = 20
        expect(potAfterSecondPlay).to.equal(TICKET_AMOUNT * 2n);
      }
    }
  });
});