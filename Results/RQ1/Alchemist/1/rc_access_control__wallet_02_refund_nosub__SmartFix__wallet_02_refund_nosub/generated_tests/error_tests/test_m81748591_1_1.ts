import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m81748591 - deposit assertion change", function () {
  it("should kill mutant by depositing exactly 1 wei (passes on original, fails on mutant)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei - original assertion: balance + 1 > balance (true)
    // Mutant assertion: balance + 1 - 1 > balance -> balance + 0 > balance (false)
    await expect(
      instance.connect(owner).deposit({ value: 1 })
    ).to.not.be.reverted;
  });
});