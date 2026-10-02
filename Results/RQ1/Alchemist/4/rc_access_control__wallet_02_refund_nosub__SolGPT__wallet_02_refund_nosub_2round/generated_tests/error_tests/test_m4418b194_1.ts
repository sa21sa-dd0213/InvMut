import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - m4418b194", function () {
  it("should detect off-by-one deposit balance bug by withdrawing exact deposit", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    await instance.connect(owner).deposit({ value: depositAmount });

    // Attempt to withdraw the exact deposited amount
    // On the original contract, this succeeds.
    // On the mutant, balance recorded as 2 wei while contract only holds 1 wei,
    // causing transfer to fail due to insufficient funds.
    await expect(
      instance.connect(owner).withdraw(depositAmount)
    ).to.be.reverted;
  });
});