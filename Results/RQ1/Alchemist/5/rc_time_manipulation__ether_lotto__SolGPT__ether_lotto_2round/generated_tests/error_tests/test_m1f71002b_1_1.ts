import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should detect mutation from block.difficulty to block.prevrandao by checking deterministic behavior", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Get initial balances
    const initialBankBalance = await ethers.provider.getBalance(owner.address);
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);

    // Play once
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // After the merge, block.difficulty returns 0, so random = 0 % 2 = 0
    // Player always wins, bank gets fee, player gets pot - fee
    // Expected: player receives (10 - 1) = 9 ETH, bank receives 1 ETH
    const expectedPlayerBalance = initialPlayerBalance - TICKET_AMOUNT + (TICKET_AMOUNT - FEE_AMOUNT);
    const expectedBankBalance = initialBankBalance + FEE_AMOUNT;

    const finalPlayerBalance = await ethers.provider.getBalance(player.address);
    const finalBankBalance = await ethers.provider.getBalance(owner.address);

    // If mutant uses block.prevrandao, the outcome is non-deterministic
    // and will likely fail this assertion (sometimes bank wins instead of player)
    expect(finalPlayerBalance).to.equal(expectedPlayerBalance);
    expect(finalBankBalance).to.equal(expectedBankBalance);
  });
});