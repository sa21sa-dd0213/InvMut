import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - m1b46e310", function () {
  it("should detect the mutant by verifying bank receives fee on winning play", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Get bank balance before play
    const bankBalanceBefore = await ethers.provider.getBalance(owner.address);

    // Play the lottery (will trigger the win condition if random == 0)
    // Since block.timestamp and block.difficulty are deterministic in test, 
    // we may need to manipulate them or call multiple times to hit random == 0
    // For this test, we call play() and if it doesn't revert, we check the bank fee
    try {
      const tx = await player.sendTransaction({
        to: await instance.getAddress(),
        value: TICKET_AMOUNT
      });
      await tx.wait();
    } catch (error: any) {
      // If transaction reverts (random == 1 case), we try again with different block context
      // by mining a new block with different difficulty
      await ethers.provider.send("evm_mine", []);
      const tx = await player.sendTransaction({
        to: await instance.getAddress(),
        value: TICKET_AMOUNT
      });
      await tx.wait();
    }

    // Get bank balance after play
    const bankBalanceAfter = await ethers.provider.getBalance(owner.address);
    const bankBalanceDiff = bankBalanceAfter - bankBalanceBefore;

    // In original: bank should receive exactly FEE_AMOUNT (1 ether)
    // In mutant: bank receives 0 because player gets the entire pot
    // If bank didn't receive the fee, the mutant is killed
    if (bankBalanceDiff === 0n) {
      // This means the mutant is active (bank got nothing)
      // Force test failure to "kill" the mutant
      expect.fail("Mutant detected: bank did not receive the fee");
    } else {
      // Original behavior: bank received the fee
      expect(bankBalanceDiff).to.equal(FEE_AMOUNT);
    }
  });
});