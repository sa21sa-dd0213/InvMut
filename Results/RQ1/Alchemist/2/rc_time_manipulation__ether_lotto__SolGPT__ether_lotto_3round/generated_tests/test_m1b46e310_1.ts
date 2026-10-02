import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - m1b46e310", function () {
  it("should kill the mutant by verifying correct transfer amounts when random == 0", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Player sends exactly TICKET_AMOUNT to play
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // After play() with random == 0, pot is 10 ether, fee is 1 ether
    // Original: player receives pot - fee = 9 ether
    // Mutant: player receives pot / fee = 10 ether (incorrect)
    const playerBalance = await ethers.provider.getBalance(player.address);
    const bankBalance = await ethers.provider.getBalance(owner.address);

    // The mutant would send 10 ether to player and 0 to bank (since pot becomes 0)
    // The original sends 9 ether to player and 1 to bank
    // We check that bank received exactly 1 ether (fee)
    // If bank didn't receive the fee, the mutant is killed
    const bankInitialBalance = await ethers.provider.getBalance(owner.address);
    const expectedBankFinalBalance = bankInitialBalance + FEE_AMOUNT;
    
    // The test will pass on original (bank gets fee) and fail on mutant (bank doesn't get fee)
    expect(bankBalance).to.equal(expectedBankFinalBalance);
  });
});