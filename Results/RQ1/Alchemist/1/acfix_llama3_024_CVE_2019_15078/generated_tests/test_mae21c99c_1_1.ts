import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mae21c99c - transferFrom multiplication bug", function () {
  it("should detect mutant by verifying recipient balance is added, not multiplied", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: give addr1 some tokens so they can transferFrom
    // The constructor sets balances[owner] = totalDistributed (200000000e18)
    // Transfer some tokens to addr1 so they have a non-zero balance
    const transferAmount = ethers.parseEther("1000");
    await instance.connect(owner).transfer(addr1.address, transferAmount);

    // Give addr2 an initial non-zero balance to test the multiplication bug
    const initialAddr2Balance = ethers.parseEther("500");
    await instance.connect(owner).transfer(addr2.address, initialAddr2Balance);

    // Owner approves addr1 to spend tokens on their behalf
    const approvalAmount = ethers.parseEther("100");
    await instance.connect(owner).approve(addr1.address, approvalAmount);

    // Get initial balances
    const addr2BalanceBefore = await instance.balanceOf(addr2.address);

    // addr1 transfers tokens from owner to addr2
    const transferFromAmount = ethers.parseEther("50");
    await instance.connect(addr1).transferFrom(owner.address, addr2.address, transferFromAmount);

    // Get final balance of addr2
    const addr2BalanceAfter = await instance.balanceOf(addr2.address);

    // In the original contract: balance = initialBalance + transferAmount
    // In the mutant: balance = initialBalance * transferAmount
    // For initialBalance = 500e18 and transferAmount = 50e18:
    // Original: 500e18 + 50e18 = 550e18
    // Mutant: 500e18 * 50e18 = 25000e36 (huge number, overflow would occur)
    const expectedBalance = initialAddr2Balance + transferFromAmount;
    expect(addr2BalanceAfter).to.equal(expectedBalance);
  });
});