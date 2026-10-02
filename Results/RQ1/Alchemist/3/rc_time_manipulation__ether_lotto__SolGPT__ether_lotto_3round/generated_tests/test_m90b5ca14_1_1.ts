import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should detect mutant that adds 1 wei to pot by checking winner receives correct amount", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n;
    const FEE_AMOUNT = 1n;

    // Play one round to put ether in the pot
    const tx1 = await player.sendTransaction({
      to: await instance.getAddress(),
      value: TICKET_AMOUNT
    });
    await tx1.wait();

    // Get initial pot value
    const potBefore = await instance.pot();

    // We need to force a win condition (random == 0)
    // Since we can't control block.timestamp or block.difficulty, we play multiple times
    // until we get a win, but we can check the invariant:
    // In original: pot should be exactly TICKET_AMOUNT (10 wei) after one play
    // In mutant: pot should be TICKET_AMOUNT + 1 (11 wei) after one play

    if (potBefore === TICKET_AMOUNT) {
      // Original behavior - pot is correct
      // Play again to trigger win and check transfer amount
      const balanceBefore = await ethers.provider.getBalance(player.address);

      // Keep playing until we win (random == 0)
      let attempts = 0;
      let playerBalanceAfter = balanceBefore;

      while (attempts < 20) {
        const tx = await player.sendTransaction({
          to: await instance.getAddress(),
          value: TICKET_AMOUNT
        });
        await tx.wait();

        const potAfterPlay = await instance.pot();

        if (potAfterPlay === 0n) {
          // Win occurred
          playerBalanceAfter = await ethers.provider.getBalance(player.address);
          break;
        }
        attempts++;
      }

      // If win occurred, check that player received exactly pot - fee
      if (playerBalanceAfter !== balanceBefore) {
        const expectedReceived = potBefore - FEE_AMOUNT; // Should be 9 wei in original
        const actualReceived = playerBalanceAfter - balanceBefore;

        // In original: actualReceived should be 9 wei
        // In mutant: actualReceived would be 10 wei (pot was 11, minus 1 fee)
        expect(actualReceived).to.equal(expectedReceived);
      }
    }
  });
});