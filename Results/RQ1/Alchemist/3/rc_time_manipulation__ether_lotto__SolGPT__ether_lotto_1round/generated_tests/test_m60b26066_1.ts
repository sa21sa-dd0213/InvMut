import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test (m60b26066)", function () {
  it("should detect mutant that replaces % with / by verifying a win is possible", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play the lottery multiple times to increase chance of triggering win condition
    for (let i = 0; i < 20; i++) {
      await instance.connect(player).play({ value: TICKET_AMOUNT });
    }

    // Check that at least one win occurred: bank balance should have increased
    const bankBalance = await ethers.provider.getBalance(owner.address);
    // If mutant (division), no wins happen, so bank only gets fees from 0 wins = 0
    // If original (modulo), some wins happen, bank gets fees from each play regardless
    // Original: bank gets FEE_AMOUNT per play, so balance = 20 * FEE_AMOUNT
    // Mutant: no wins, bank gets FEE_AMOUNT per play, same as original actually...
    // Better check: pot should sometimes be reset to 0 (win) vs never reset (mutant)
    
    // Actually check that player's balance increased (won at least once)
    const playerBalance = await ethers.provider.getBalance(player.address);
    const initialPlayerBalance = ethers.parseEther("10000"); // assuming signer starts with this
    
    // In mutant, player never wins, so player balance = initial - 20 * 10 = initial - 200
    // In original, player wins ~10 times, getting ~(10-1)*10 = 90 each win = ~900 total, minus losses
    // Simpler: check that owner (bank) did NOT receive all the pot (meaning player won some)
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(0); // In original, pot is always reset after win
    // But in mutant, pot keeps accumulating because no win ever resets it
    // So if pot != 0 after many plays, it's the mutant
  });
});