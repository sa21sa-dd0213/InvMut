import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8fe5d5ab", function () {
  it("should kill the mutant by verifying pot is not always reset", async function () {
    const [owner, player1, player2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times to observe behavior
    // In the original contract, pot only resets ~50% of the time
    // In the mutant, pot always resets
    
    // First play
    await instance.connect(player1).play({ value: TICKET_AMOUNT });
    let potAfterFirstPlay = await instance.pot();
    
    // Second play
    await instance.connect(player2).play({ value: TICKET_AMOUNT });
    let potAfterSecondPlay = await instance.pot();

    // In the mutant, both plays would reset pot to 0
    // In the original, there's a chance pot accumulates
    // We play multiple times and expect at least one non-zero pot
    // This will fail for the mutant (always 0) but pass for original
    
    // Play more times to increase probability of detecting difference
    let foundNonZero = false;
    for (let i = 0; i < 10; i++) {
      const randomPlayer = [player1, player2][i % 2];
      await instance.connect(randomPlayer).play({ value: TICKET_AMOUNT });
      const currentPot = await instance.pot();
      if (currentPot > 0n) {
        foundNonZero = true;
        break;
      }
    }
    
    // Assert that we found a non-zero pot at some point
    // This will fail for the mutant (always 0) but should pass for original
    expect(foundNonZero).to.be.true;
  });
});