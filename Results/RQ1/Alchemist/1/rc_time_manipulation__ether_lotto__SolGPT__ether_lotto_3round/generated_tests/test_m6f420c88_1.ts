import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m6f420c88 detection", function () {
  it("should kill mutant by verifying that payout with pot + FEE_AMOUNT reverts due to insufficient balance", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Player sends exactly TICKET_AMOUNT to play
    // After this transaction, pot = TICKET_AMOUNT, contract balance = TICKET_AMOUNT
    await expect(
      instance.connect(player).play({ value: TICKET_AMOUNT })
    ).to.not.be.reverted;

    // Check that the contract balance is now 0 (all funds distributed)
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(0);

    // Verify player received the correct amount (pot - fee = 9 wei in the original)
    // In the mutant, the player would have received pot + fee = 11 wei, which would have failed
    // Since the transaction succeeded, we know the original logic was used
    // To specifically kill the mutant, we need to trigger the revert case:
    // The mutant will revert when random == 0 because it tries to send pot + fee > contract balance
    
    // Deploy a fresh instance to test the exact scenario
    const instance2 = await Factory.deploy();
    await instance2.waitForDeployment();
    
    // We need to ensure random == 0 (50% chance), so we run multiple times
    // or use a deterministic approach - since we can't control block.timestamp,
    // we run the test multiple times or accept probabilistic detection
    
    // For deterministic kill, we can check that if the contract tries to send
    // pot + FEE_AMOUNT when pot == TICKET_AMOUNT and contract balance == TICKET_AMOUNT,
    // it will revert because it needs to send TICKET_AMOUNT + FEE_AMOUNT but only has TICKET_AMOUNT
    
    // This scenario always reverts in the mutant when random == 0, but never in the original
    // Let's run multiple plays to increase probability of hitting random == 0
    let mutantDetected = false;
    for (let i = 0; i < 10; i++) {
      const freshInstance = await Factory.deploy();
      await freshInstance.waitForDeployment();
      
      try {
        const tx = await freshInstance.connect(player).play({ value: TICKET_AMOUNT });
        await tx.wait();
        // If transaction succeeds, we need to check if player got the right amount
        // In original: player gets pot - fee, in mutant: player gets pot + fee
        // But if random == 1, both work the same (no transfer to player)
        // So we need to detect via balance checks when random == 0
      } catch (error: any) {
        // If it reverts, this is likely the mutant (random == 0 case)
        if (error.message.includes("revert") || error.message.includes("insufficient funds")) {
          mutantDetected = true;
          break;
        }
      }
    }
    
    // If mutant is detected, the test passes (kills the mutant)
    // If not detected (unlikely after 10 attempts), test still passes as we're testing detection
    expect(mutantDetected).to.be.true;
  });
});