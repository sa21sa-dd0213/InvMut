import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should detect mutant that changes % to / by verifying player can win", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times to ensure at least one win in the original contract
    const numberOfPlays = 20;
    let playerWon = false;

    for (let i = 0; i < numberOfPlays; i++) {
      const balanceBefore = await ethers.provider.getBalance(player.address);
      
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      const receipt = await tx.wait();
      
      const balanceAfter = await ethers.provider.getBalance(player.address);
      
      // Player wins if they received pot minus fee (pot = 10, fee = 1, so they get 9 back)
      if (balanceAfter > balanceBefore - TICKET_AMOUNT) {
        playerWon = true;
        break;
      }
    }

    // In the original contract, with enough plays, player should win at least once
    // In the mutant, player can NEVER win because random / 2 is never 0
    expect(playerWon).to.be.true;
  });
});