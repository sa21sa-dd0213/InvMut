import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant kill test - m26902560", function () {
  it("should kill mutant that subtracts 1 from msg.value in deposit", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositAmount = 1n;
    await instance.connect(user).deposit({ value: depositAmount });

    // Try to withdraw 1 wei - should fail on mutant (balance is 0), succeed on original
    await expect(
      instance.connect(user).withdraw(depositAmount)
    ).to.be.reverted;
  });
});