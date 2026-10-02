import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8fe5d5ab test", function () {
  it("should revert when player does not win (random != 0) but mutant always pays out", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Alternative simpler approach: check that after calling play, the pot is not always zero
    // In mutant, pot is always reset to 0 (since condition always true)
    // In original, pot sometimes stays non-zero (when player loses)
    let foundLoss = false;
    for (let i = 0; i < 20; i++) {
      const potBefore = await instance.pot();
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await tx.wait();
      const potAfter = await instance.pot();

      // If pot is not reset to 0, it means random != 0 (loss scenario in original)
      if (potAfter > BigInt(0)) {
        foundLoss = true;
        break;
      }
    }

    // In mutant, pot is always 0 after play (since condition always true)
    // So if we never find a loss scenario, mutant is detected
    expect(foundLoss).to.be.true;
  });
});