import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should kill mutant m95593fba by sending exactly 10 wei (TICKET_AMOUNT) and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 wei (TICKET_AMOUNT) to play function
    // Original: requires msg.value == 10 -> succeeds
    // Mutant: requires msg.value + 1 == 10 -> fails because 10+1 != 10
    const tx = instance.connect(player).play({ value: 10n });

    // In original contract this should succeed; in mutant it should revert
    await expect(tx).to.not.be.reverted;
  });
});