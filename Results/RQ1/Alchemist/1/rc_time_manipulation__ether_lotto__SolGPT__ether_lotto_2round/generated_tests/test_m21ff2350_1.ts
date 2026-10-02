import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - m21ff2350", function () {
  it("should send pot minus fee to the player when random == 0, kill mutant that uses false", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = ethers.parseEther("10");
    const feeAmount = ethers.parseEther("1");
    const prizeAmount = ticketAmount - feeAmount; // 9 wei in this simplified version

    // Player sends exactly ticketAmount to play
    const tx = await instance.connect(player).play({ value: ticketAmount });
    const receipt = await tx.wait();

    // Check that player received prizeAmount (pot - fee)
    // The original contract sends pot - FEE_AMOUNT to msg.sender when random == 0
    // The mutant never sends, so player balance change should be 0 (or gas cost only)
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    // Player spent ticketAmount but should have received prizeAmount back
    // Net change: playerBalanceAfter - playerBalanceBefore = -ticketAmount + prizeAmount = -feeAmount
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    const netChange = playerBalanceAfter - playerBalanceBefore;
    
    // In the original, netChange should be -feeAmount (lost only the fee)
    // In the mutant, netChange should be -ticketAmount (lost everything, no prize sent)
    expect(netChange).to.equal(-feeAmount);
  });
});