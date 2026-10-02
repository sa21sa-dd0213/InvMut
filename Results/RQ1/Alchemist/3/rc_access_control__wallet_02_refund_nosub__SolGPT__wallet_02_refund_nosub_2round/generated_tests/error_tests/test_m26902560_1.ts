import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - m26902560", function () {
  it("should kill mutant by depositing 1 wei and then withdrawing 1 wei", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositTx = await instance.deposit({ value: 1 });
    await depositTx.wait();

    // Try to withdraw 1 wei - should succeed on original, revert on mutant
    // because mutant records balance as 0 (msg.value - 1 = 0)
    await expect(instance.withdraw(1)).to.be.reverted;
  });
});