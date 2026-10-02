import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m90b5ca14 detection", function () {
  it("should detect mutant that increments pot by msg.value+1 instead of msg.value", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = 10n; // TICKET_AMOUNT = 10 wei
    const feeAmount = 1n;
    // FEE_AMOUNT = 1 wei

    // Player sends exactly 10 wei to play
    const tx = await instance.connect(player).play({ value: ticketAmount });
    await tx.wait();

    // In the original contract, pot = 10, player receives 9 on win, bank receives 1
    // In the mutant, pot = 11 (msg.value + 1), so if player wins they would receive 10 instead of 9
    // This test checks that the player's balance change is exactly 9 wei (pot - fee) when they win,
    // which would fail against the mutant where the player would receive 10 wei

    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    // Since we can't guarantee win/loss outcome, we check the contract balance
    // Contract should have exactly 10 wei after one play (before any payout)
    const contractBalance = await ethers.provider.getBalance(instance.target);

    // The mutant adds 1 to pot, so pot becomes 11 but only 10 wei actually sent
    // This means contract balance (10) won't match pot (11) in mutant
    // We can detect this by checking that pot equals contract balance
    const pot = await instance.pot();
    expect(pot).to.equal(contractBalance);
  });
});