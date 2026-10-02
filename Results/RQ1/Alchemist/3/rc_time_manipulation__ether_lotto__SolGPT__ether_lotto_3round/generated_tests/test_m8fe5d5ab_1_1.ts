import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8fe5d5ab test", function () {
  it("should detect mutant that replaces random == 0 with true", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times to observe the behavior
    let playerLostAtLeastOnce = false;

    for (let i = 0; i < 10; i++) {
      const playerBalanceBefore = await ethers.provider.getBalance(player.address);
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await tx.wait();
      const playerBalanceAfter = await ethers.provider.getBalance(player.address);

      // If player didn't receive the pot (minus fee), they lost this round
      if (playerBalanceAfter <= playerBalanceBefore - TICKET_AMOUNT) {
        playerLostAtLeastOnce = true;
        break;
      }
    }

    // In the original contract, the player should lose roughly 50% of the time
    // In the mutant (always true), the player always wins, so they never lose
    expect(playerLostAtLeastOnce).to.be.true;
  });
});