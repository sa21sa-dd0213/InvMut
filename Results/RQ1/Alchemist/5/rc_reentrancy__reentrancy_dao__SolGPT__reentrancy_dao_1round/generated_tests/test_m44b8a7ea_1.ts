import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - m44b8a7ea", function () {
  it("should detect balance inflation by depositing 1 wei, withdrawing, then attempting second withdrawal", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 deposits exactly 1 wei
    const depositTx1 = await instance.connect(addr1).deposit({ value: 1 });
    await depositTx1.wait();

    // addr1 withdraws all - should succeed
    const withdrawTx1 = await instance.connect(addr1).withdrawAll();
    await withdrawTx1.wait();

    // addr2 attempts to withdraw (should have 0 credit, so nothing happens)
    // But if balance is inflated, it won't affect addr2's withdrawal directly.
    // Instead, addr2 deposits 0 wei and tries to withdraw - this tests balance state
    const depositTx2 = await instance.connect(addr2).deposit({ value: 1 });
    await depositTx2.wait();

    const withdrawTx2 = await instance.connect(addr2).withdrawAll();
    await withdrawTx2.wait();

    // Now the contract should have 0 balance. If mutant inflated balance,
    // balance will still show 1 wei even though contract has 0 ether.
    // Try one more withdrawal from addr1 (who has 0 credit) - this will succeed trivially
    // But to detect the inflation, we check that balance equals actual contract ether
    const contractBalance = await ethers.provider.getBalance(instance.target);
    // The storage variable 'balance' is private, so we check via contract behavior:
    // If balance > contract ether, a withdrawal from a fresh deposit will revert
    const depositTx3 = await instance.connect(addr1).deposit({ value: 1 });
    await depositTx3.wait();

    // On original: balance = 1, contract ether = 1 -> withdrawal works
    // On mutant: balance = 2, contract ether = 1 -> withdrawal tries to send 1 wei,
    // subtracts 1 from balance (balance becomes 1), sends 1 wei successfully,
    // but then balance is still 1 while contract has 0 ether -> next withdrawal fails
    const withdrawTx3 = await instance.connect(addr1).withdrawAll();
    await withdrawTx3.wait();

    // Now try one more deposit+withdrawal from addr2 - this should fail on mutant
    const depositTx4 = await instance.connect(addr2).deposit({ value: 1 });
    await depositTx4.wait();

    // On mutant: balance = 2 (1 leftover + 1 new deposit), contract ether = 1
    // withdrawal tries to send 1 wei, but require(callResult) will revert
    await expect(
      instance.connect(addr2).withdrawAll()
    ).to.be.reverted;
  });
});