import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m60b26066 detection", function () {
  it("should detect the mutant by verifying the bank receives the fee approximately 50% of the time", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    const NUM_GAMES = 20;
    let bankFeeCount = 0;

    for (let i = 0; i < NUM_GAMES; i++) {
      const bankBalanceBefore = await ethers.provider.getBalance(instance.getAddress());
      await player.sendTransaction({
        to: instance.getAddress(),
        value: TICKET_AMOUNT
      });
      const bankBalanceAfter = await ethers.provider.getBalance(instance.getAddress());
      const bankDelta = bankBalanceAfter - bankBalanceBefore;
      if (bankDelta >= FEE_AMOUNT) {
        bankFeeCount++;
      }
    }

    // In the original contract, the bank should receive the fee roughly 50% of the time
    // In the mutant (where / 2 is used instead of % 2), the bank almost never receives the fee
    expect(bankFeeCount).to.be.greaterThan(0);
    expect(bankFeeCount).to.be.lessThan(NUM_GAMES);
  });
});