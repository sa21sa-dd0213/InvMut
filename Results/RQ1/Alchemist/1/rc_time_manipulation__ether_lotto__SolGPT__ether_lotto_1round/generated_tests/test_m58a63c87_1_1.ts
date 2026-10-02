import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m58a63c87", function () {
  it("should detect mutant that replaces block.difficulty with block.prevrandao", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Get initial balances
    const initialBankBalance = await ethers.provider.getBalance(owner.address);
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);

    // Player plays exactly once
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt = await tx.wait();

    // Get final balances
    const finalBankBalance = await ethers.provider.getBalance(owner.address);
    const finalPlayerBalance = await ethers.provider.getBalance(player.address);

    // In the original contract with block.difficulty = 0 (post-Merge), random == 0 always,
    // so player wins: player gets pot - fee, bank gets fee.
    // In the mutant with block.prevrandao, random is non-zero, so player loses: bank gets entire pot.

    // Check that bank received exactly the fee (1 ETH) - this will fail on mutant
    // because mutant sends entire pot to bank
    expect(finalBankBalance - initialBankBalance).to.equal(FEE_AMOUNT);

    // Check that player received pot minus fee (9 ETH) minus gas costs
    // This assertion will also fail on mutant since player gets nothing
    const playerReceived = finalPlayerBalance - initialPlayerBalance;
    expect(playerReceived + FEE_AMOUNT).to.equal(TICKET_AMOUNT); // before gas
  });
});