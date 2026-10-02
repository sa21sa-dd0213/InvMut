import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m88f20210", function () {
  it("should kill mutant by verifying pot equals full ticket amount after play", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n;
    const playTx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await playTx.wait();

    const potAfterPlay = await instance.pot();
    // In the original, pot becomes 10; in the mutant, pot becomes 9
    expect(potAfterPlay).to.equal(TICKET_AMOUNT);
  });
});