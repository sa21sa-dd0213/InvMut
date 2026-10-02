import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m95593fba test", function () {
  it("should revert when sending exactly 10 wei (the correct TICKET_AMOUNT) because mutant requires msg.value+1 == 10", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n;

    // In the original contract, sending 10 wei would succeed.
    // In the mutant, require(msg.value+1 == TICKET_AMOUNT) becomes require(11 == 10) which is false.
    // Therefore, the transaction should revert.
    await expect(
      instance.connect(player).play({ value: TICKET_AMOUNT })
    ).to.be.reverted;
  });
});