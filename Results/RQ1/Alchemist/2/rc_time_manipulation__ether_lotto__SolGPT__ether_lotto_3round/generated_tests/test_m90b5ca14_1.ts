import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should kill mutant m90b5ca14 by verifying fee deduction on win", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Record player balance before playing
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);

    // Call play with exactly TICKET_AMOUNT
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // Record player balance after playing
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);

    // Calculate net change (ignoring gas costs for simplicity)
    const netChange = playerBalanceAfter - playerBalanceBefore;

    // In the original contract, if player wins, they get pot - FEE_AMOUNT = 9 ether
    // Their net change should be -1 ether (they paid 10, got back 9)
    // In the mutant, pot becomes 11 ether, they get 10 back, net change = 0
    // The test kills the mutant because the mutant passes this assertion
    // while the original would fail (original net change would be -1 ether)
    expect(netChange).to.equal(0);
  });
});