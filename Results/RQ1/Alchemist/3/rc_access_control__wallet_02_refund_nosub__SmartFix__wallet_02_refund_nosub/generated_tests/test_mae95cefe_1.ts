import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - mae95cefe", function () {
  it("should kill mutant by depositing 1 wei and then withdrawing 1 wei", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositTx = await instance.connect(owner).deposit({ value: 1 });
    await depositTx.wait();

    // Attempt to withdraw 1 wei - should succeed on original, fail on mutant
    await expect(
      instance.connect(owner).withdraw(1)
    ).to.be.reverted;
  });
});