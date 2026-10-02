import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m21ff2350 detection", function () {
  it("should detect mutant by verifying player wins at least once over multiple plays", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = ethers.parseEther("10");
    const plays = 20;
    let playerWon = false;

    for (let i = 0; i < plays; i++) {
      // Track player balance before play
      const balanceBefore = await ethers.provider.getBalance(player.address);
      
      // Player plays
      const tx = await instance.connect(player).play({ value: ticketAmount });
      await tx.wait();

      // Track player balance after play
      const balanceAfter = await ethers.provider.getBalance(player.address);
      
      // Calculate balance change (after - before)
      const balanceChange = balanceAfter - balanceBefore;

      // If balance increased by more than 0 (net gain), player won
      if (balanceChange > 0n) {
        playerWon = true;
        break;
      }
    }

    // In the original contract, with 20 plays there should be ~50% chance of at least one win
    // In the mutant (if condition always false), player can never win
    expect(playerWon).to.be.true;
  });
});