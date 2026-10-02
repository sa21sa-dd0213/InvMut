import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - ma84d0ec9", function () {
  it("should kill the mutant by showing that the second consecutive call reverts when the condition is always true", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n;

    // First play: in mutant, player always wins, pot becomes 0 after transfer
    await player.sendTransaction({
      to: await instance.getAddress(),
      value: TICKET_AMOUNT
    });

    // Second play: in mutant, pot is 0, but condition is always true,
    // so the transfer of (pot - FEE_AMOUNT) would underflow or revert
    // In original, pot would still be 10 after a loss, so second play succeeds
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: TICKET_AMOUNT
      })
    ).to.be.reverted;
  });
});