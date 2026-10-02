import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mb9ac9b62 - withdraw with < instead of <=", function () {
  it("should allow withdrawing the full balance (original) but mutant reverts", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 100 wei
    const depositAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    await (await instance.deposit({ value: depositAmount })).wait();

    // Attempt to withdraw the full balance (100 wei)
    // Original: require(amount <= balance) -> passes
    // Mutant: require(amount < balance) -> reverts because amount equals balance
    await expect(
      instance.withdraw(depositAmount)
    ).to.be.reverted;
  });
});