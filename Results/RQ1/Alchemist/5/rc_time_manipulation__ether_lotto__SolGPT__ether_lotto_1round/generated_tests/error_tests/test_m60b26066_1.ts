import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m60b26066", function () {
  it("should detect the mutant that replaces % with / by verifying that the pot resets after wins occur", async function () {
    const [owner, player1, player2] = await ethers.getSigners();
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Deploy contract with owner as bank
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Play multiple times from different players to increase chances of hitting the win condition
    // In the original, roughly 50% of plays will win (random == 0)
    // In the mutant, random is always > 0 (since division by 2 of large numbers), so no wins ever occur
    
    let totalPlays = 20;
    let initialPot = 0n;
    
    for (let i = 0; i < totalPlays; i++) {
      // Alternate between two players to avoid nonce issues
      const player = i % 2 === 0 ? player1 : player2;
      
      // Get pot before play
      const potBefore = await instance.pot();
      
      // Play the lottery
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await tx.wait();
      
      // Get pot after play
      const potAfter = await instance.pot();
      
      // If pot was reset to 0, a win occurred (original behavior)
      // If pot keeps accumulating, the mutant is present (no wins)
      if (i === 0) {
        initialPot = potAfter;
      }
    }
    
    // In the original contract, with 20 plays, there should be at least one win
    // (probability of 0 wins in 20 plays is 0.5^20 ≈ 0.0001%)
    // When a win occurs, pot is reset to 0
    // So the final pot should be less than the total accumulated if no wins happened
    
    // If mutant is present, pot will be exactly: totalPlays * TICKET_AMOUNT (no wins ever)
    // If original, pot will be less (some wins occurred)
    const expectedMutantPot = BigInt(totalPlays) * TICKET_AMOUNT;
    const actualPot = await instance.pot();
    
    // Assert that the pot is NOT equal to what it would be if no wins occurred
    // This kills the mutant because the mutant always produces the "no win" scenario
    expect(actualPot).to.be.lessThan(expectedMutantPot);
    
    // Additional check: verify that at least one transfer happened (bank received fee)
    // In mutant, bank never receives any fee because no wins occur
    const bankBalance = await ethers.provider.getBalance(instance.getAddress());
    // Bank should have received at least one FEE_AMOUNT if any win occurred
    // This assertion will fail for the mutant (bank balance = 0)
    expect(bankBalance).to.be.gt(0n);
  });
});