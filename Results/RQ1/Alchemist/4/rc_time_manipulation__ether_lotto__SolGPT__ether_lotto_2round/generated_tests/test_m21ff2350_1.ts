import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m21ff2350 detection", function () {
  it("should detect mutant by verifying player wins at least once over multiple plays", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = ethers.parseEther("10");
    const feeAmount = ethers.parseEther("1");
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
      
      // If player received more than they paid (net gain after losing ticket amount but receiving pot minus fee)
      // Player pays 10 ether, if they win they get pot (which is 10 from their own bet) minus 1 fee = 9 back
      // But net effect: they lose 1 ether when they lose, gain 9 when they win (since they got back 9 from their 10)
      // So balance change = +9 if win, -10 if lose (since they sent 10)
      const balanceChange = balanceAfter - balanceBefore;
      
      // If balance increased by more than 0 (after sending 10), they must have received a payout
      if (balanceChange > ethers.parseEther("0")) {
        playerWon = true;
        break;
      }
    }

    // In the original contract, with 20 plays there should be ~50% chance of at least one win
    // In the mutant (if condition always false), player can never win
    expect(playerWon).to.be.true;
  });
});