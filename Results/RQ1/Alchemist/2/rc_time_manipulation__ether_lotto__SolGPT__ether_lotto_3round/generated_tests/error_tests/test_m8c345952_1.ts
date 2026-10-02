import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should kill mutant m8c345952 by sending exactly TICKET_AMOUNT and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n; // 10 wei as defined in contract

    // Send exactly TICKET_AMOUNT - should succeed on original, revert on mutant
    await expect(
      instance.connect(player).play({ value: TICKET_AMOUNT })
    ).to.not.be.reverted;
  });
});