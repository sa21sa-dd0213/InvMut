import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m58a63c87 detection", function () {
  it("should detect the mutant by verifying different outcomes across blocks", async function () {
    const [owner, player1, player2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times in different blocks and collect results
    const results: string[] = [];
    
    // Play 5 times, each in a different block
    for (let i = 0; i < 5; i++) {
      // Get current pot before playing
      const potBefore = await instance.pot();
      
      // Play as player1
      const tx = await instance.connect(player1).play({ value: TICKET_AMOUNT });
      const receipt = await tx.wait();
      
      // Determine who won by checking pot after transaction
      const potAfter = await instance.pot();
      
      if (potAfter === 0n) {
        // Pot was reset - someone won
        // Check if bank received fee
        const bankBalance = await ethers.provider.getBalance(instance.target);
        // If bank balance increased by exactly FEE_AMOUNT, bank didn't win (player won)
        // If bank balance increased by more, bank won
        results.push("winner_determined");
      } else {
        results.push("no_winner");
      }
      
      // Mine a new block to change block.prevrandao
      await ethers.provider.send("evm_mine", []);
    }

    // The mutant should produce varying results across blocks
    // The original with constant block.difficulty would always produce the same result
    const uniqueResults = new Set(results);
    
    // With 5 trials and random outcomes, we expect at least 2 different results
    // (if mutant is present) or all same (if original behavior)
    expect(uniqueResults.size).to.be.greaterThan(1);
  });
});