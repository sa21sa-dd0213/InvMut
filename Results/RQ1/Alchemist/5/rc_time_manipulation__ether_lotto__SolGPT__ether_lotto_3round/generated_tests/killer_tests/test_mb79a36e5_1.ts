import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant mb79a36e5 - require(msg.value >= TICKET_AMOUNT)", function () {
  it("should revert when sending more than TICKET_AMOUNT (detects mutant)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call play() with 20 wei (greater than TICKET_AMOUNT which is 10)
    // Original requires exact 10 wei and would revert on overpayment.
    // Mutant accepts overpayment, so this test should fail on the mutant.
    await expect(
      instance.connect(player).play({ value: 20 })
    ).to.be.reverted;
  });
});