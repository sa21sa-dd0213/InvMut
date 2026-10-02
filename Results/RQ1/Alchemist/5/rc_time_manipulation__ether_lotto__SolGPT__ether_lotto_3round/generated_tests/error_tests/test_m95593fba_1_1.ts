import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should kill mutant by sending exactly 10 wei (TICKET_AMOUNT) and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 wei (TICKET_AMOUNT) to play()
    // In original: msg.value == 10 passes
    // In mutant: msg.value + 1 == 10 => 11 == 10 fails (reverts)
    await expect(
      instance.connect(player).play({ value: 10 })
    ).to.not.be.reverted;
  });
});