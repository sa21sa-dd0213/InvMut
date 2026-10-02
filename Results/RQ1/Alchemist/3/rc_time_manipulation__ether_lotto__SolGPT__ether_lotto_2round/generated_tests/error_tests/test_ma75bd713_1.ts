import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - block.prevrandao vs block.timestamp", function () {
  it("should kill the mutant by showing different results across blocks when block.timestamp changes", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");

    // Play once in the first block
    await player.sendTransaction({
      to: await instance.getAddress(),
      value: TICKET_AMOUNT
    });

    // Get the result after first play
    const potAfterFirst = await instance.pot();

    // Mine a new block to change block.timestamp
    await ethers.provider.send("evm_mine", []);

    // Play again in a new block
    await player.sendTransaction({
      to: await instance.getAddress(),
      value: TICKET_AMOUNT
    });

    // Get the result after second play
    const potAfterSecond = await instance.pot();

    // In the original contract, block.timestamp changes between blocks,
    // so the random outcome can differ, potentially leading to different pot states.
    // In the mutant, block.prevrandao is constant across blocks,
    // so with same player address and block.difficulty, the outcome is identical,
    // causing the pot to always be reset to 0 after each win.
    // This test asserts that the pot can be non-zero after a loss, which
    // the mutant would never allow (always win/loss same pattern, pot always 0 after first win).
    expect(potAfterFirst).to.not.equal(potAfterSecond);
  });
});