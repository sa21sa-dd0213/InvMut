import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should detect mutant that adds 1 extra wei to pot", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n;

    // Player sends exactly TICKET_AMOUNT (10 wei)
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // Check the pot after one play
    const pot = await instance.pot();

    // In original: pot should be 10 (the exact amount sent)
    // In mutant: pot becomes 11 (msg.value + 1)
    expect(pot).to.equal(TICKET_AMOUNT);
  });
});