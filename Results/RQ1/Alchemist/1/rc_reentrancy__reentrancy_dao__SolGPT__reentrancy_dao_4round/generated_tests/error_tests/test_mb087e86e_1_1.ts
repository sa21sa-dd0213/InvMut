import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - deposit balance underflow", function () {
  it("should kill mutant mb087e86e by depositing 1 wei and withdrawing, expecting success on original but revert on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositTx = await instance.deposit({ value: 1 });
    await depositTx.wait();

    // Attempt to withdraw all - should succeed on original (balance = 1, credit = 1)
    // On mutant, balance becomes 0 after deposit (1 - 1 = 0), so withdrawAll will underflow
    await expect(instance.withdrawAll()).to.be.reverted;
  });
});