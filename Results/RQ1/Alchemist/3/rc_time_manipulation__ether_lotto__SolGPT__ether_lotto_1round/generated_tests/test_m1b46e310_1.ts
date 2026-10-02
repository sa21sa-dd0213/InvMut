import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m1b46e310", function () {
  it("should detect division operator replacement in play function", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balances
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

    // Player plays with exactly TICKET_AMOUNT = 10 wei
    const tx = await instance.connect(player).play({ value: 10 });
    const receipt = await tx.wait();

    // Calculate gas cost
    const gasCost = receipt.gasUsed * receipt.gasPrice;

    // Get final balances
    const finalPlayerBalance = await ethers.provider.getBalance(player.address);
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

    // In original contract: player should receive pot - FEE_AMOUNT = 10 - 1 = 9 wei
    // Bank should receive FEE_AMOUNT = 1 wei
    // In mutant: player receives pot / FEE_AMOUNT = 10 / 1 = 10 wei, bank receives 0

    // Expected transfer to player in original: 9 wei (minus gas)
    // Expected transfer to bank in original: 1 wei
    const expectedPlayerPayout = 9n;
    const expectedOwnerPayout = 1n;

    // Check that player received exactly pot - FEE_AMOUNT (not pot / FEE_AMOUNT)
    expect(finalPlayerBalance).to.equal(
      initialPlayerBalance + expectedPlayerPayout - gasCost
    );

    // Check that owner received exactly FEE_AMOUNT
    expect(finalOwnerBalance).to.equal(
      initialOwnerBalance + expectedOwnerPayout
    );

    // Also verify the pot is reset to 0
    const pot = await instance.pot();
    expect(pot).to.equal(0);
  });
});