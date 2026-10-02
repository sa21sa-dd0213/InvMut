import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant test - kill mc54d80df", function () {
  it("should revert when sending 11 wei (mutant incorrectly accepts it)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract requires exactly 10 wei (TICKET_AMOUNT).
    // The mutant changes the condition to msg.value - 1 == TICKET_AMOUNT,
    // so it would accept 11 wei (11 - 1 == 10) instead of reverting.
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: 11
      })
    ).to.be.reverted;
  });
});