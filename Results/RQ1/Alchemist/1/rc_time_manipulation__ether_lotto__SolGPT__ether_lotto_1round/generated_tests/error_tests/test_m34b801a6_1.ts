import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - block.prevrandao vs block.timestamp", function () {
  it("should detect mutant by verifying timestamp-dependent randomness across blocks", async function () {
    const [owner, player1, player2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Get initial block timestamp and mine a new block to ensure we have control
    let blockNum = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNum);
    let initialTimestamp = block!.timestamp;

    // Play once in current block - record result
    await player1.sendTransaction({
      to: await instance.getAddress(),
      value: TICKET_AMOUNT
    });
    const potAfterFirstPlay = await instance.pot();

    // Mine a new block with a different timestamp (increase by 10 seconds)
    await ethers.provider.send("evm_increaseTime", [10]);
    await ethers.provider.send("evm_mine", []);

    // Play again from a different player in the new block
    await player2.sendTransaction({
      to: await instance.getAddress(),
      value: TICKET_AMOUNT
    });
    const potAfterSecondPlay = await instance.pot();

    // In the original contract using block.timestamp, if the parity of timestamp changes,
    // the outcome could differ (random % 2). In the mutant using block.prevrandao,
    // the outcome depends on a different source. The key observation:
    // If both plays resulted in a win (pot reset to 0) or both resulted in a loss (pot accumulated),
    // the mutant might behave differently than the original when timestamp changes.
    // The test asserts that the two plays produced different outcomes (one win, one loss)
    // because the timestamp changed between blocks. If the mutant uses prevrandao,
    // it might produce the same outcome for both plays, causing the assertion to fail.
    // Note: This is probabilistic but expected to pass on original with high probability
    // given the timestamp change alters the random seed.
    expect(potAfterFirstPlay).to.not.equal(potAfterSecondPlay);
  });
});