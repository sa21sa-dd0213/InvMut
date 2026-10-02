import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should detect balance discrepancy when depositing 1 wei and withdrawing", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositTx = await instance.deposit({ value: 1 });
    await depositTx.wait();

    // Attempt to withdraw all - should revert on mutant because balance will be 0 instead of 1
    await expect(instance.connect(owner).withdrawAll()).to.be.reverted;
  });
});