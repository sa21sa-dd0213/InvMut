import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should revert when sending exactly TICKET_AMOUNT (10 wei) because mutant requires msg.value-1 == TICKET_AMOUNT", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(msg.value == TICKET_AMOUNT) to require(msg.value-1 == TICKET_AMOUNT)
    // Original: sending 10 wei succeeds. Mutant: sending 10 wei fails because 10-1 != 10
    // To kill the mutant, we send exactly 10 wei and expect revert (mutant behavior) vs original which would succeed
    await expect(
      instance.connect(player).play({ value: 10 })
    ).to.be.reverted;
  });
});