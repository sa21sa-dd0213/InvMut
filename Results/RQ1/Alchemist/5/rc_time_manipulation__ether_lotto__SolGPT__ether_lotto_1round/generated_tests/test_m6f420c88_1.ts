import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m6f420c88 test", function () {
  it("should revert when trying to pay winner more than contract balance due to addition instead of subtraction", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract - no constructor arguments needed for EtherLotto
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Player sends exactly TICKET_AMOUNT (10 wei) to play
    const TICKET_AMOUNT = 10;
    
    // The first play should result in random == 0 (50% chance)
    // If random == 0, original sends pot - FEE_AMOUNT = 10 - 1 = 9 wei
    // Mutant tries to send pot + FEE_AMOUNT = 10 + 1 = 11 wei, which exceeds contract balance
    
    // We need to ensure we get random == 0. Since we can't control block.timestamp/block.difficulty,
    // we try multiple times. Alternatively, we just check that the transaction reverts
    // when the mutant would try to overpay
    
    // Play the game - if random == 0, mutant will revert because it tries to send 11 wei from 10 wei balance
    const tx = player.sendTransaction({
      to: await instance.getAddress(),
      value: TICKET_AMOUNT
    });
    
    // If random == 0, this transaction will revert in the mutant (but not in original)
    // We check that the transaction either succeeds (random != 0) or reverts (random == 0)
    // The key is that the original never reverts on payout, but the mutant does
    try {
      await (await tx).wait();
      // Transaction succeeded - random was 1 (no payout), or original behavior
    } catch (error: any) {
      // If it reverts, it could be the mutant trying to overpay (random == 0)
      // We verify it's a revert due to failed transfer
      expect(error.message).to.include("transfer failed");
    }
    
    // More deterministic test: we need to ensure random == 0
    // We can mine blocks until we get the desired outcome
    let attempt = 0;
    const maxAttempts = 10;
    
    while (attempt < maxAttempts) {
      attempt++;
      
      // Get fresh contract for each attempt
      const freshInstance = await Factory.deploy();
      await freshInstance.waitForDeployment();
      
      const playerBalanceBefore = await ethers.provider.getBalance(player.address);
      
      try {
        const playTx = await player.sendTransaction({
          to: await freshInstance.getAddress(),
          value: TICKET_AMOUNT
        });
        await playTx.wait();
        
        // Check if pot was reset (meaning random == 0 and payout happened)
        const pot = await freshInstance.pot();
        
        if (pot === 0n) {
          // random was 0, payout happened
          // In original: player receives 9 wei, bank gets 1 wei
          // In mutant: would try to send 11 wei - should have reverted
          // Since we didn't revert, this attempt had random == 1
          // Continue to next attempt
        } else {
          // pot is still 10, random was 1
          continue;
        }
      } catch (error: any) {
        // Transaction reverted - this is the expected behavior for mutant when random == 0
        expect(error.message).to.include("transfer failed");
        return; // Test passed - mutant killed
      }
      
      // Mine a new block to change block.timestamp/block.difficulty
      await ethers.provider.send("evm_mine", []);
    }
    
    // If we get here, we couldn't trigger random == 0 in maxAttempts tries
    // This is statistically very unlikely (1/2^10 chance)
    // We force the condition by checking the contract logic directly
    // The test should still pass because the mutant will always revert when random == 0
    expect.fail("Could not trigger random == 0 scenario");
  });
});