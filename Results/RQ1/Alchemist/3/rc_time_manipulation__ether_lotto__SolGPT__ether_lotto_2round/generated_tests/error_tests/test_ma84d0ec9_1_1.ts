import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant ma84d0ec9 test", function () {
  it("should detect mutant that always pays out (true instead of random==0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = ethers.parseEther("10");
    const feeAmount = ethers.parseEther("1");

    // First play - in the original, this may or may not pay out.
    // In the mutant, it always pays out, so the pot will be reset to 0.
    await instance.connect(addr1).play({ value: ticketAmount });

    // Get the pot after first play
    let potAfterFirst = await instance.pot();

    // Second play
    await instance.connect(addr1).play({ value: ticketAmount });

    // Get the pot after second play
    let potAfterSecond = await instance.pot();

    // In the original contract, if the first play was a losing one (random == 1),
    // the pot would accumulate to 20 before the second play, and after the second
    // play it could either pay out (reset to 0) or accumulate further.
    // The key observation: in the mutant, after ANY play, the pot is always 0
    // because the payout branch always executes.
    // Therefore, if we check that the pot is always 0 after each play, the mutant
    // will always pass that check, but the original would sometimes have a non-zero pot.
    // To kill the mutant, we need a test that expects a non-zero pot after a play
    // that would be a loss in the original (random == 1).
    // Since we cannot control randomness, we run multiple plays and check that
    // at least once the pot becomes non-zero (which would happen in the original
    // but never in the mutant).

    // Play many times to increase chance of a losing play in the original
    let foundNonZeroPot = false;
    for (let i = 0; i < 20; i++) {
      await instance.connect(addr1).play({ value: ticketAmount });
      const currentPot = await instance.pot();
      if (currentPot > 0) {
        foundNonZeroPot = true;
        break;
      }
    }

    // The mutant will never have a non-zero pot because it always pays out
    // The original will eventually have a non-zero pot after a losing play
    // So if we expect a non-zero pot to occur, the mutant will fail this test
    expect(foundNonZeroPot).to.be.true;
  });
});