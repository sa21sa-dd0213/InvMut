import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m006ee545 - transfer recipient balance mutation", function () {
  it("should detect mutant that replaces addition with multiplication in transfer recipient balance update", async function () {
    const [owner, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balances
    const initialRecipientBalance = await instance.balanceOf(recipient.address);
    const initialOwnerBalance = await instance.balanceOf(owner.address);

    // Owner needs tokens to transfer; call getTokens() to acquire some
    await instance.connect(owner).getTokens({ value: ethers.parseEther("1") });
    const ownerBalanceAfterMint = await instance.balanceOf(owner.address);
    expect(ownerBalanceAfterMint).to.be.gt(initialOwnerBalance);

    // Transfer a known amount to recipient
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(recipient.address, transferAmount);

    // Get final recipient balance
    const finalRecipientBalance = await instance.balanceOf(recipient.address);

    // In the original contract: final = initial + transferAmount
    // In the mutant: final = initial * transferAmount
    // If initial is 0, both would give 0 (since 0 * anything = 0 and 0 + anything = anything)
    // To kill the mutant, we need a non-zero initial balance
    // First transfer to give recipient a non-zero balance
    const firstTransferAmount = ethers.parseEther("50");
    await instance.connect(owner).transfer(recipient.address, firstTransferAmount);
    const balanceAfterFirstTransfer = await instance.balanceOf(recipient.address);
    expect(balanceAfterFirstTransfer).to.equal(firstTransferAmount);

    // Second transfer to detect the mutation
    const secondTransferAmount = ethers.parseEther("30");
    await instance.connect(owner).transfer(recipient.address, secondTransferAmount);
    const balanceAfterSecondTransfer = await instance.balanceOf(recipient.address);

    // Expected with original: 50 + 30 = 80
    // Expected with mutant: 50 * 30 = 1500
    // Assert that balance is correct (will fail on mutant)
    expect(balanceAfterSecondTransfer).to.equal(firstTransferAmount + secondTransferAmount);
  });
});