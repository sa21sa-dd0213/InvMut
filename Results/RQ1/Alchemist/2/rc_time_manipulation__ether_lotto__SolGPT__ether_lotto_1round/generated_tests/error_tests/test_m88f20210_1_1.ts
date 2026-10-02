import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m88f20210", function () {
  it("should detect the mutant that subtracts 1 from msg.value when adding to pot", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Play twice, sending exactly 10 wei each time (TICKET_AMOUNT)
    const TICKET_AMOUNT = 10n;

    // First play - send exactly 10 wei
    const tx1 = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx1.wait();

    // Second play - send exactly 10 wei
    const tx2 = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx2.wait();

    // Check the pot - should be 20 if original code (10+10), but 18 if mutant (9+9)
    const potAfterTwoPlays = await instance.pot();
    expect(potAfterTwoPlays).to.equal(20n);
  });
});