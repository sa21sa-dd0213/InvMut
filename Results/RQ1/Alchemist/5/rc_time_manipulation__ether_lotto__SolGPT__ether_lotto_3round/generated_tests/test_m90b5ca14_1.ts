import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should detect mutant that adds 1 to msg.value when updating pot", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n;
    
    // Player plays once with exact ticket amount
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // Check the pot - in original it should be TICKET_AMOUNT (10)
    // In mutant it would be TICKET_AMOUNT + 1 (11)
    const potAfterOnePlay = await instance.pot();
    
    // The pot should be 0 if the player won (random == 0) or TICKET_AMOUNT if they lost
    // But we can't control randomness, so we play multiple times and check the sum
    
    // Play a second time
    const tx2 = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx2.wait();
    
    const potAfterTwoPlays = await instance.pot();
    
    // If both plays lost (pot accumulated), original would have 20, mutant would have 22
    // If first won, second lost: original 10, mutant 11
    // If first lost, second won: original 0, mutant 0 (pot reset on win)
    // If both won: both 0
    
    // The key check: in the original, pot can only be 0, 10, or 20 after two plays
    // In the mutant, pot can be 0, 11, or 22 after two plays
    // So we assert that pot is NOT equal to the mutant-expected values when possible
    
    // Play enough to guarantee a loss streak (very unlikely to win 3 times in a row with 50% chance)
    // Actually, let's just verify that after many plays, the pot modulo TICKET_AMOUNT is 0
    // In original, pot % 10 == 0 always; in mutant, pot % 10 == number_of_losses % 10
    
    for (let i = 0; i < 5; i++) {
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await tx.wait();
    }
    
    const finalPot = await instance.pot();
    
    // In the original, pot is always a multiple of TICKET_AMOUNT (10)
    // In the mutant, pot is always (number_of_losses * (TICKET_AMOUNT + 1)) % ... which is NOT a multiple of 10
    // Unless number_of_losses is a multiple of 10, which is extremely unlikely in 7 plays
    expect(finalPot % TICKET_AMOUNT).to.equal(0);
  });
});