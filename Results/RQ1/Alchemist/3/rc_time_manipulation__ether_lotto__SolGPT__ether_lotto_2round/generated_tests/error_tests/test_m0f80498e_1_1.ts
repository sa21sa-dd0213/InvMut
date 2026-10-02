import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m0f80498e test", function () {
  it("should detect mutant that subtracts 1 from msg.value when adding to pot", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n;
    const FEE_AMOUNT = 1n;

    // Player sends exactly TICKET_AMOUNT wei
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // Check the pot after the play
    const potAfterPlay = await instance.pot();

    // In the original contract, pot should be TICKET_AMOUNT (10 wei)
    // In the mutant, pot would be TICKET_AMOUNT - 1 (9 wei)
    // The mutant is killed if this assertion fails
    expect(potAfterPlay).to.equal(TICKET_AMOUNT);
  });
});