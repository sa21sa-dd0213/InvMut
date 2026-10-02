import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should kill mutant m51c35cde by verifying pot resets to zero after a winning round", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple rounds until we get a win (random == 0) which should reset pot to zero
    // In the mutant, pot will never reset, so we expect at least one reset
    let potResets = 0;
    for (let i = 0; i < 20; i++) {
      const potBefore = await instance.pot();
      await instance.connect(player).play({ value: TICKET_AMOUNT });
      const potAfter = await instance.pot();

      // If the pot resets to zero, a win occurred
      if (potBefore > 0n && potAfter === 0n) {
        potResets++;
      }
    }

    // In the original contract, with enough rounds, at least one win should occur
    // In the mutant (if (false)), no win ever occurs, so potResets will be 0
    expect(potResets).to.be.greaterThan(0);
  });
});