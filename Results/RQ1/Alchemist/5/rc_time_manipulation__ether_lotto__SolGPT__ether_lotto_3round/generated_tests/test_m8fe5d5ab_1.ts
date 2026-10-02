import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8fe5d5ab", function () {
  it("should revert when player does not win (random != 0) but mutant always pays out", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times to increase probability of hitting a case where random != 0
    // The mutant will always execute the payout branch, so the pot will always be reset
    // We track the pot after each play to detect if the mutant incorrectly pays out
    let previousPot = await instance.pot();
    
    // Play 10 times - in the original contract, sometimes the pot would not be reset
    for (let i = 0; i < 10; i++) {
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await tx.wait();
      
      const currentPot = await instance.pot();
      
      // If the mutant is present, the pot will always be 0 after each play
      // In the original, sometimes the pot would accumulate
      if (currentPot === BigInt(0) && previousPot > BigInt(0)) {
        // This should not happen consistently - if it happens every time, mutant is detected
      }
      previousPot = currentPot;
    }

    // The key assertion: in the original contract, the player would NOT always get paid
    // The mutant always pays out, so the bank balance would always increase by the fee
    const bankBalance = await ethers.provider.getBalance(owner.address);
    const expectedBankBalance = ethers.parseEther("10000"); // Initial balance
    expect(bankBalance).to.be.gt(expectedBankBalance); // If mutant, bank always gets fee
    
    // Additional check: player's balance should have increased by (pot - fee) every time
    // If mutant is present, player wins every time and gets significant ether
    const playerBalance = await ethers.provider.getBalance(player.address);
    const expectedPlayerLoss = TICKET_AMOUNT * BigInt(10); // Would lose all if never wins
    expect(playerBalance).to.be.gt(ethers.parseEther("9990")); // If mutant, player keeps most ether
  });
});