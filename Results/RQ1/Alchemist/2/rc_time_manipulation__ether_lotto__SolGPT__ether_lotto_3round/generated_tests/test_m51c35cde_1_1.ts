import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m51c35cde detection", function () {
  it("should detect mutant by verifying that player never wins (pot never resets)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = ethers.parseEther("10");
    const feeAmount = ethers.parseEther("1");

    // Play multiple times to increase chance of hitting the winning condition
    for (let i = 0; i < 10; i++) {
      await instance.connect(player).play({ value: ticketAmount });
    }

    // In the original contract, if any play resulted in random == 0, pot would be reset to 0.
    // In the mutant, the condition is always false, so pot should equal 10 * ticketAmount.
    const potAfterPlays = await instance.pot();
    expect(potAfterPlays).to.equal(ticketAmount * 10n);
  });
});