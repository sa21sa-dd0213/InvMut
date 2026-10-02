import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EtherLotto mutant m51c35cde", function () {
  it("should kill mutant by verifying player receives payout and pot resets when winning condition should trigger", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = ethers.parseEther("10");
    const feeAmount = ethers.parseEther("1");

    // Record player's balance before playing
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);

    // Player sends exactly TICKET_AMOUNT (10 wei) to play
    const tx = await instance.connect(player).play({ value: ticketAmount });
    await tx.wait();

    // Record player's balance after playing
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);

    // Check that pot was reset to 0 (player won since random == 0)
    const potAfter = await instance.pot();
    expect(potAfter).to.equal(0);

    // Check that player received pot - fee (9 wei)
    const expectedPayout = ticketAmount - feeAmount;
    const actualPayout = playerBalanceAfter - playerBalanceBefore + ticketAmount; // +ticketAmount because player sent it
    expect(actualPayout).to.equal(expectedPayout);
  });
});