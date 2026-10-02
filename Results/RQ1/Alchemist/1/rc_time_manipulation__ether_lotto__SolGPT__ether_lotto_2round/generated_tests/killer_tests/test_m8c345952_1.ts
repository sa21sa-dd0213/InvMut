import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8c345952 test", function () {
  it("should kill the mutant by sending exactly TICKET_AMOUNT (10 wei) and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Player sends exactly 10 wei (TICKET_AMOUNT)
    // Original requires msg.value == 10 -> passes
    // Mutant requires msg.value != 10 -> reverts
    const tx = instance.connect(player).play({ value: 10 });
    await expect(tx).to.not.be.reverted;
  });
});