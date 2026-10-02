import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - ma84d0ec9", function () {
  it("should kill mutant by verifying that pot only resets on random == 0 (approximately 50% of plays)", async function () {
    const [owner, player1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play the game multiple times to observe the behavior
    // In the original, approximately half the plays should reset the pot to 0
    // In the mutant (if true), every play will reset the pot to 0
    
    // First play - record pot after
    await instance.connect(player1).play({ value: TICKET_AMOUNT });
    let potAfterFirstPlay = await instance.pot();
    
    // If mutant is present, pot will always be 0 after any play
    // If original, pot may be 0 (if random==0) or TICKET_AMOUNT (if random==1)
    
    // Second play - regardless of outcome, in mutant pot will reset to 0
    await instance.connect(player1).play({ value: TICKET_AMOUNT });
    let potAfterSecondPlay = await instance.pot();
    
    // In the mutant, pot will always be 0 after the second play
    // In the original, pot could be non-zero if both plays resulted in random==1
    // (pot would be 2 * TICKET_AMOUNT = 20 ether)
    
    // To reliably kill the mutant, we need to detect the deterministic behavior
    // The mutant ALWAYS executes the winning branch, so after any play:
    // - pot is always reset to 0
    // - bank always receives FEE_AMOUNT
    // - player always receives pot - FEE_AMOUNT
    
    // We can verify this by checking that after the second play, 
    // the pot is 0 in the mutant but could be non-zero in original
    // Since this is probabilistic, we play many times to increase confidence
    
    // Play multiple times and track pot behavior
    let potWasNonZero = false;
    for (let i = 0; i < 10; i++) {
      await instance.connect(player1).play({ value: TICKET_AMOUNT });
      const currentPot = await instance.pot();
      if (currentPot > 0) {
        potWasNonZero = true;
        break;
      }
    }
    
    // In the original contract, there is ~99.9% chance that at least one play
    // results in random == 1 (pot not reset), so potWasNonZero should be true
    // In the mutant, pot is ALWAYS 0 after every play, so potWasNonZero is false
    
    // The test passes on original (potWasNonZero is true with high probability)
    // The test fails on mutant (potWasNonZero is always false)
    expect(potWasNonZero).to.be.true;
  });
});