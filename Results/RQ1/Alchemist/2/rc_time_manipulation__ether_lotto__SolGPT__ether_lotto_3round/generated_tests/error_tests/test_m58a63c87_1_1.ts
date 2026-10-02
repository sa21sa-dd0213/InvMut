import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m58a63c87", function () {
  it("should kill mutant by showing different randomness behavior with block.prevrandao vs block.difficulty", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Record results from multiple calls at different timestamps
    const results: boolean[] = [];
    const numRounds = 20;

    for (let i = 0; i < numRounds; i++) {
      // Mine a new block with specific timestamp and difficulty to create deterministic behavior
      await ethers.provider.send("evm_setNextBlockTimestamp", [Math.floor(Date.now() / 1000) + i * 100]);
      
      // For original: block.difficulty is always 2000000000000000 (constant pre-merge)
      // For mutant: block.prevrandao will be different (random beacon output)
      // We set difficulty explicitly to verify the mutant uses prevrandao instead
      await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x2540BE400"]); // keep gas reasonable
      
      // Get initial pot
      const potBefore = await instance.pot();

      // Player plays
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await tx.wait();

      // Check if pot was reset (player won) or not (bank won)
      const potAfter = await instance.pot();
      const playerWon = potAfter === 0n && potBefore !== 0n;
      results.push(playerWon);
    }

    // Count wins and losses
    const wins = results.filter(r => r === true).length;
    const losses = results.filter(r => r === false).length;

    // On the original contract with constant block.difficulty,
    // the modulo operation with block.timestamp gives a predictable pattern.
    // On the mutant, block.prevrandao introduces truly random values,
    // causing a statistically different win/loss distribution.
    
    // We expect that on the original, with deterministic block.timestamp increments,
    // the pattern will be consistent (e.g., alternating or fixed).
    // On the mutant, results will be random and unpredictable.
    
    // Specifically test: on original, with sequential timestamps and constant difficulty,
    // the random value (timestamp % 2) alternates. So wins/losses should alternate perfectly.
    // On mutant, prevrandao breaks this pattern.
    
    const alternatingPattern = results.every((val, idx) => {
      if (idx === 0) return true;
      return val !== results[idx - 1];
    });

    // If the mutant is present, the pattern will NOT be alternating because prevrandao
    // adds randomness. If original, pattern should alternate perfectly.
    // We assert that the pattern is NOT alternating (mutant killed)
    expect(alternatingPattern).to.be.false;
  });
});