import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should revert when sending exactly 10 wei to play() - killing mutant that requires msg.value-1 == TICKET_AMOUNT", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 wei (TICKET_AMOUNT) - should succeed on original, fail on mutant
    await expect(
      instance.connect(player).play({ value: 10 })
    ).to.be.reverted;
  });
});