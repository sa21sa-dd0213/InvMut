import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - ma84d0ec9", function () {
  it("should kill mutant by verifying that pot only resets on random == 0 (approximately 50% of plays)", async function () {
    const [owner, player1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // First play - record pot after
    await instance.connect(player1).play({ value: TICKET_AMOUNT });
    let potAfterFirstPlay = await instance.pot();

    // Second play
    await instance.connect(player1).play({ value: TICKET_AMOUNT });
    let potAfterSecondPlay = await instance.pot();

    // Play multiple times and track pot behavior
    let potWasNonZero = false;
    for (let i = 0; i < 10; i++) {
      await instance.connect(player1).play({ value: TICKET_AMOUNT });
      const currentPot = await instance.pot();
      if (currentPot > 0) {
        potWasNonZero = true;
        break;
      }
    }

    // In the original contract, there is ~99.9% chance that at least one play
    // results in random == 1 (pot not reset), so potWasNonZero should be true
    // In the mutant, pot is ALWAYS 0 after every play, so potWasNonZero is false
    expect(potWasNonZero).to.be.true;
  });
});