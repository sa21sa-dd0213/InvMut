import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should revert when sending 10 wei (original ticket amount) because mutant requires 11 wei", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(msg.value == TICKET_AMOUNT) to require(msg.value-1 == TICKET_AMOUNT)
    // TICKET_AMOUNT = 10, so mutant requires msg.value = 11 (since 11 - 1 = 10)
    // Sending exactly 10 wei should succeed on original but revert on mutant
    await expect(
      instance.connect(player).play({ value: 10 })
    ).to.be.reverted;
  });
});