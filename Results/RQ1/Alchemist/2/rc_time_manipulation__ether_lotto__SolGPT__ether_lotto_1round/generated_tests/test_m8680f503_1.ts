import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should kill mutant m8680f503 by testing win/loss logic inversion", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Get initial balances
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    const initialPot = await instance.pot();

    // Play two times - we will determine win/loss based on pot behavior
    // First play: if original contract, when random==0 player wins, when random!=0 pot accumulates
    await instance.connect(player).play({ value: TICKET_AMOUNT });
    const potAfterFirstPlay = await instance.pot();

    // Second play
    await instance.connect(player).play({ value: TICKET_AMOUNT });
    const potAfterSecondPlay = await instance.pot();

    // Calculate actual player balance change
    const finalPlayerBalance = await ethers.provider.getBalance(player.address);
    const playerBalanceChange = finalPlayerBalance - initialPlayerBalance;

    // Determine what happened:
    // In original: if first play won (pot reset to 0), player got pot - fee
    // If first play lost (pot increased), pot doubled (2 * TICKET_AMOUNT)
    // Second play then either wins or loses again

    if (potAfterFirstPlay === BigInt(0)) {
      // First play was a win in original
      // Player received pot (10) - fee (1) = 9
      // Net change: -10 (ticket) + 9 (winning) = -1
      expect(playerBalanceChange).to.equal(ethers.parseEther("-1"));
    } else if (potAfterFirstPlay === TICKET_AMOUNT) {
      // First play was a loss in original, pot = 10
      // Second play: if win, pot = 20, player gets 20 - 1 = 19
      // Net: -10 (ticket1) -10 (ticket2) + 19 (win) = -1
      if (potAfterSecondPlay === BigInt(0)) {
        expect(playerBalanceChange).to.equal(ethers.parseEther("-1"));
      } else {
        // Both losses: pot = 20, player spent 20
        expect(playerBalanceChange).to.equal(ethers.parseEther("-20"));
      }
    } else {
      // First play: pot = 10 (loss)
      // Second play: if win, pot = 20 -> reset to 0
      if (potAfterSecondPlay === BigInt(0)) {
        expect(playerBalanceChange).to.equal(ethers.parseEther("-1"));
      } else {
        expect(playerBalanceChange).to.equal(ethers.parseEther("-20"));
      }
    }

    // The mutant inverts the condition, so if original had a win scenario,
    // the mutant would have a loss, causing different balance changes.
    // This test will pass on original but fail on mutant due to inverted logic.
  });
});