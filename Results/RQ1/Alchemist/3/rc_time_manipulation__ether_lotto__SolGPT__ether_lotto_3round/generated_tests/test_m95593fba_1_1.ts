import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should detect mutant m95593fba by sending exactly 10 wei and expecting success", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = 10n; // TICKET_AMOUNT = 10 wei
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    const bankBalanceBefore = await ethers.provider.getBalance(owner.address);

    // Send exactly 10 wei (original requirement)
    const tx = await instance.connect(player).play({ value: ticketAmount });
    const receipt = await tx.wait();

    // Verify transaction succeeded (no revert)
    expect(receipt.status).to.equal(1);

    // Verify pot was updated correctly
    const potAfter = await instance.pot();
    expect(potAfter).to.equal(0n); // pot should be reset after win/loss

    // Verify funds were transferred
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    const bankBalanceAfter = await ethers.provider.getBalance(owner.address);

    // Player should have either won or lost, but transaction should not revert
    expect(playerBalanceAfter).to.not.equal(playerBalanceBefore);
    expect(bankBalanceAfter).to.not.equal(bankBalanceBefore);
  });
});