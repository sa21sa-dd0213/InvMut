import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m51c35cde test", function () {
  it("should detect mutant that replaces random == 0 with false by verifying payout on a winning round", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n;
    const FEE_AMOUNT = 1n;

    // Get initial balances
    const bankBefore = await ethers.provider.getBalance(owner.address);
    const playerBefore = await ethers.provider.getBalance(player.address);

    // Player plays exactly once with 10 wei
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // Get balances after the transaction
    const bankAfter = await ethers.provider.getBalance(owner.address);
    const playerAfter = await ethers.provider.getBalance(player.address);

    // Calculate actual transfers
    const bankChange = bankAfter - bankBefore;
    const playerChange = playerAfter - playerBefore;

    // In the original contract, if random == 0 (which happens ~50% of the time),
    // the bank receives FEE_AMOUNT and the player receives pot - FEE_AMOUNT.
    // Since we cannot control randomness, we check that the mutant is killed
    // by asserting that at least one of the two possible outcomes occurs correctly.
    // The mutant will NEVER transfer any funds, so both balances will be unchanged
    // (except for the player's ticket cost which stays in the contract).
    // We detect the mutant by checking that the pot was NOT reset and no transfers happened.
    
    // In the mutant, after the call:
    // - pot should still be TICKET_AMOUNT (10) because the winning branch never executes
    // - bank balance should be unchanged (no fee transfer)
    // - player balance should be reduced by exactly TICKET_AMOUNT (no payout)
    
    const potAfter = await instance.pot();
    
    // If the mutant is present, the pot remains 10 and no transfers occur
    // If the original is present, either the pot is 0 (if random==0) or remains 10 (if random==1)
    // and appropriate transfers happen
    
    // We detect the mutant by checking the impossible combination:
    // If random was 0 (win), original would reset pot to 0 and transfer
    // If random was 1 (lose), original would keep pot at 10 and no transfers
    // The mutant always behaves like "lose" but with the bug that it can never win
    
    // To reliably kill the mutant, we run multiple times and check that
    // at least once the winning branch executed (pot reset and transfers happened)
    // Since we cannot control randomness, we run many rounds and check for the winning outcome
    
    let sawWin = false;
    for (let i = 0; i < 20; i++) {
      const playerBeforeLoop = await ethers.provider.getBalance(player.address);
      const bankBeforeLoop = await ethers.provider.getBalance(owner.address);
      const potBeforeLoop = await instance.pot();
      
      const txLoop = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await txLoop.wait();
      
      const potAfterLoop = await instance.pot();
      const playerAfterLoop = await ethers.provider.getBalance(player.address);
      const bankAfterLoop = await ethers.provider.getBalance(owner.address);
      
      // If pot was reset to 0, that's a win - check transfers happened
      if (potAfterLoop === 0n) {
        // In original: bank gets FEE, player gets (potBefore - FEE)
        expect(bankAfterLoop - bankBeforeLoop).to.equal(FEE_AMOUNT);
        expect(playerAfterLoop - playerBeforeLoop).to.equal(potBeforeLoop - FEE_AMOUNT - TICKET_AMOUNT);
        sawWin = true;
        break;
      }
    }
    
    // If we never saw a win in 20 attempts, the mutant is likely present
    // (probability of no win in 20 tries with original is (1/2)^20 ≈ 0.0001%)
    expect(sawWin).to.be.true;
  });
});