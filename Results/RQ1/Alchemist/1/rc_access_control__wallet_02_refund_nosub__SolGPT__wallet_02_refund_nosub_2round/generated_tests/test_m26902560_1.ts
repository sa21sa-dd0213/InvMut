import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - m26902560", function () {
  it("should detect mutant that subtracts 1 from msg.value in deposit", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositAmount = 1n;
    await instance.connect(user).deposit({ value: depositAmount });

    // Attempt to withdraw the deposited amount - should succeed on original, fail on mutant
    await expect(
      instance.connect(user).withdraw(depositAmount)
    ).to.be.reverted;
  });
});