import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m34b801a6 test", function () {
  it("should detect mutant that replaces block.timestamp with block.prevrandao by observing non-deterministic behavior", async function () {
    const [owner, player1, player2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Play multiple times from different players in different blocks
    // In the original contract, block.timestamp changes per block,
    // so we should see varying outcomes (sometimes random == 0, sometimes not)
    // In the mutant, block.prevrandao is used instead, which combined with
    // block.difficulty (=0 post-merge) gives deterministic results
    
    const results: boolean[] = [];
    const numGames = 10;
    
    for (let i = 0; i < numGames; i++) {
      // Use different players and mine a new block each time to get different block values
      const player = i % 2 === 0 ? player1 : player2;
      
      // Get pot before play
      const potBefore = await instance.pot();
      
      // Play the game
      await instance.connect(player).play({ value: TICKET_AMOUNT });
      
      // Get pot after play - if pot was reset to 0, random was 0 (win)
      const potAfter = await instance.pot();
      
      // If random == 0: pot becomes 0 (winner gets pot - fee)
      // If random == 1: pot increases by ticket amount (no win)
      results.push(potAfter === BigInt(0));
    }
    
    // In a deterministic mutant, all results would be the same
    // (either all wins or all losses depending on block.prevrandao values)
    // In the original with varying timestamps, we expect at least one win and one loss
    const hasWin = results.some(r => r === true);
    const hasLoss = results.some(r => r === false);
    
    // This assertion will pass on original (both win and loss observed)
    // but fail on mutant (all same outcome)
    expect(hasWin && hasLoss).to.be.true;
  });
});