import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should detect mutant m8c345952 by sending exactly TICKET_AMOUNT and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n; // matches constant in contract

    // In the original contract, sending exactly 10 wei should succeed
    // In the mutant (require(msg.value != TICKET_AMOUNT)), sending exactly 10 wei should revert
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: TICKET_AMOUNT
      })
    ).to.not.be.reverted;

    // Verify the pot was updated as expected (mutant would have reverted before this)
    const pot = await instance.pot();
    expect(pot).to.equal(TICKET_AMOUNT);
  });
});