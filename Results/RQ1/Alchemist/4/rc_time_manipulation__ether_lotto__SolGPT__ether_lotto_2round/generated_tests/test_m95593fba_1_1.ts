import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m95593fba detection", function () {
  it("should revert when sending exactly 10 wei (TICKET_AMOUNT) because mutant requires msg.value == 9", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original requires msg.value == 10, but mutant changes to msg.value + 1 == 10 (i.e., msg.value == 9)
    // Sending exactly 10 wei should succeed on original but revert on mutant
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: 10n, // exactly TICKET_AMOUNT
      })
    ).to.be.reverted;
  });
});