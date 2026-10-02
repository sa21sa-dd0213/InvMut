import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m51c35cde", function () {
  it("should detect mutant by verifying that pot never resets and no fee is paid when random would be 0", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = ethers.parseEther("10");
    const feeAmount = ethers.parseEther("1");

    // Play multiple times to increase probability of hitting the random == 0 case
    for (let i = 0; i < 10; i++) {
      // Get initial balances
      const initialBankBalance = await ethers.provider.getBalance(owner.address);
      const initialPlayerBalance = await ethers.provider.getBalance(player.address);
      const initialPot = await instance.pot();

      // Play the game
      const tx = await instance.connect(player).play({ value: ticketAmount });
      await tx.wait();

      // After each play, verify the pot never resets to 0 (mutant behavior)
      const currentPot = await instance.pot();
      expect(currentPot).to.equal(initialPot + ticketAmount);

      // Verify bank never receives the fee (mutant never executes transfer)
      const currentBankBalance = await ethers.provider.getBalance(owner.address);
      expect(currentBankBalance).to.equal(initialBankBalance);

      // Verify player never receives pot minus fee (mutant never executes transfer)
      const currentPlayerBalance = await ethers.provider.getBalance(player.address);
      expect(currentPlayerBalance).to.equal(initialPlayerBalance - ticketAmount);
    }

    // Final verification: pot should have accumulated all ticket amounts (no payout)
    const finalPot = await instance.pot();
    expect(finalPot).to.equal(ticketAmount * 10n);
  });
});