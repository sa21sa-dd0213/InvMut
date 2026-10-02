import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8c345952", function () {
  it("should revert when sending exactly TICKET_AMOUNT (10 wei) due to mutated require statement", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to play with exactly 10 wei (TICKET_AMOUNT)
    // In the original contract this would succeed; in the mutant it should revert
    // because the condition is msg.value != TICKET_AMOUNT
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: 10n, // exactly TICKET_AMOUNT
        data: instance.interface.encodeFunctionData("play")
      })
    ).to.be.reverted;
  });
});