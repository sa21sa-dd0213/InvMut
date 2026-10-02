import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - block.prevrandao vs block.timestamp", function () {
  it("should kill mutant m34b801a6 by showing same outcome for two plays in same block", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Get player balance before
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Play once in block with timestamp T
    const timestamp1 = 1000000;
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp1]);
    const txA = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receiptA = await txA.wait();
    const balanceAfterFirst = await ethers.provider.getBalance(player.address);
    const change1 = balanceAfterFirst - balanceBefore;

    // Now mine another block with the SAME timestamp (hardhat allows this)
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp1]);
    const txB = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receiptB = await txB.wait();
    const balanceAfterSecond = await ethers.provider.getBalance(player.address);
    const change2 = balanceAfterSecond - balanceAfterFirst;

    // In the original contract, both plays use same timestamp => same random => same outcome
    // => same net change (either both win: +9 each time, or both lose: -10 each time)
    // In the mutant, block.prevrandao will be different for the two blocks
    // (even though timestamp is same, prevrandao changes each block)
    // => outcomes may differ => changes differ
    // So if we assert that change1 == change2, this assertion PASSES on original
    // but FAILS on mutant (since changes may differ). That kills the mutant.
    expect(change1).to.equal(change2);
  });
});