import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m90b5ca14", function () {
  it("should detect mutant that adds 1 to msg.value when updating pot", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Player sends exactly TICKET_AMOUNT (10 ether) to play
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();
    
    // Check the pot after the transaction
    // In the original contract, pot should be exactly TICKET_AMOUNT (10 ether)
    // In the mutant, pot becomes TICKET_AMOUNT + 1 wei (due to msg.value+1)
    const potAfter = await instance.pot();
    
    // For the original, pot would be 0 (since random==0 case transfers everything)
    // But if random != 0, pot would be TICKET_AMOUNT
    // To reliably detect the mutant, we need to check the pot when the random result doesn't reset it
    // The best approach: check that pot can never exceed expected values
    // Since the mutant adds 1 extra wei, we check that pot is not exactly TICKET_AMOUNT when it should be
    
    // Actually, let's rethink: The random determines if pot gets reset.
    // To reliably test, we can call play multiple times and check that pot
    // never exceeds what's expected from the original logic
    
    // Simpler approach: check that the player's balance change is correct
    // In the mutant, the pot grows by msg.value+1 instead of msg.value
    
    // Most direct test: after a play where random != 0, pot should be TICKET_AMOUNT
    // But the mutant makes it TICKET_AMOUNT + 1 wei
    // We can't control randomness, so let's use a different strategy
    
    // Let's check that the contract's balance doesn't have extra wei
    const contractBalance = await ethers.provider.getBalance(instance.target);
    const expectedBalance = TICKET_AMOUNT; // from the single play
    // In the mutant, the extra 1 wei would make balance = TICKET_AMOUNT + 1 wei
    // But actually, the pot was incremented by msg.value+1, so if random != 0,
    // the pot stays, and the extra 1 wei stays in the contract
    
    // The key insight: in the mutant, pot += msg.value + 1 adds 1 extra wei
    // This means the contract balance will be 1 wei higher than expected
    // when the random result doesn't trigger the payout
    
    // Since we can't control randomness, let's use a different approach:
    // Check that after ANY play, the pot is either 0 or TICKET_AMOUNT
    // In the mutant, it could be TICKET_AMOUNT + 1 wei
    
    // Actually, the simplest test: send exactly TICKET_AMOUNT and verify
    // the pot value after the transaction is either 0 or exactly TICKET_AMOUNT
    // In the mutant, it could be 0 or TICKET_AMOUNT + 1 wei
    
    // We'll just check that pot is NOT equal to TICKET_AMOUNT + 1n (the mutant value)
    expect(potAfter).to.not.equal(TICKET_AMOUNT + 1n);
    
    // For completeness, also check that pot is either 0 or TICKET_AMOUNT
    expect(potAfter === 0n || potAfter === TICKET_AMOUNT).to.be.true;
  });
});