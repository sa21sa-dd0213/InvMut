import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8c345952 test", function () {
  it("should kill mutant by sending exactly TICKET_AMOUNT and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = 10n; // TICKET_AMOUNT = 10 wei
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);

    // Send exactly TICKET_AMOUNT (10 wei) - should succeed in original, revert in mutant
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: ticketAmount
      })
    ).to.not.be.reverted;

    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    // Verify the transaction actually happened (player lost the ticket amount)
    expect(playerBalanceBefore - playerBalanceAfter).to.equal(ticketAmount);
  });
});