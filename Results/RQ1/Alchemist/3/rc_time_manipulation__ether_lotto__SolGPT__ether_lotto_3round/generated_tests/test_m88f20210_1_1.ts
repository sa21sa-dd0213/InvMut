import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant test", function () {
  it("should kill mutant m88f20210 by verifying correct payout on win", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play until player wins (random == 0)
    let playerWon = false;
    while (!playerWon) {
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      const receipt = await tx.wait();

      // Check if player's balance increased (win condition)
      // For simplicity, we check the event/logs or contract state
      const potAfter = await instance.pot();
      if (potAfter === 0n) {
        playerWon = true;
      }
    }

    // After a win, verify the player received correct amount
    // In original: pot = 10, winner gets 10 - 1 = 9
    // In mutant: pot = 9, winner gets 9 - 1 = 8
    // We check the contract's bank balance to infer payout
    const bankBalance = await ethers.provider.getBalance(instance.target);
    const expectedBankBalance = FEE_AMOUNT; // bank keeps 1 wei fee
    expect(bankBalance).to.equal(expectedBankBalance);
  });
});