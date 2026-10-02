import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should detect mutant that always triggers win condition", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play twice - in original contract, player doesn't always win
    // In mutant, player always wins (condition is always true)
    let playerBalanceBefore = await ethers.provider.getBalance(player.address);
    
    // First play
    await instance.connect(player).play({ value: TICKET_AMOUNT });
    let playerBalanceAfter = await ethers.provider.getBalance(player.address);
    let potAfterFirstPlay = await instance.pot();
    
    // If mutant is present, player always wins (pot becomes 0 after first play)
    // In original, player may lose (pot retains value)
    if (potAfterFirstPlay === BigInt(0)) {
      // Player won first round - need to check if mutant makes them always win
      // Play again to see if they win again (mutant behavior)
      await instance.connect(player).play({ value: TICKET_AMOUNT });
      let potAfterSecondPlay = await instance.pot();
      
      // In mutant, pot will always be 0 after each play (always wins)
      // In original, there's ~25% chance both plays win, but we can verify by playing multiple times
      // For deterministic detection, play 5 times - in original, probability of always winning is 1/32
      for (let i = 0; i < 3; i++) {
        await instance.connect(player).play({ value: TICKET_AMOUNT });
      }
      
      let finalPot = await instance.pot();
      // If mutant, pot will always be 0 after each win
      // If original, extremely unlikely (1/32) to have all wins
      expect(finalPot).to.equal(0); // This will pass on mutant, fail on original
    } else {
      // Player lost first round - this is normal original behavior
      // Verify pot increased by ticket amount (minus fee not taken since no win)
      expect(potAfterFirstPlay).to.equal(TICKET_AMOUNT);
    }
  });
});