import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m88f20210 test", function () {
  it("should detect mutant that adds msg.value - 1 instead of msg.value to pot", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n; // 10 wei

    // Player sends exactly TICKET_AMOUNT wei
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: TICKET_AMOUNT
    });
    await tx.wait();

    // Check the pot - original would be 10, mutant would be 9
    const pot = await instance.pot();
    expect(pot).to.equal(TICKET_AMOUNT);
  });
});