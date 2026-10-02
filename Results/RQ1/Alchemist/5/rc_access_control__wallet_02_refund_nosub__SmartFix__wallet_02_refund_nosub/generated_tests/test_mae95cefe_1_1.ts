import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant kill test", function () {
  it("should kill mutant mae95cefe by depositing 1 wei and then withdrawing it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositTx = await instance.connect(owner).deposit({ value: 1 });
    await depositTx.wait();

    // Attempt to withdraw 1 wei - this should succeed on original but fail on mutant
    // because mutant records balance as msg.value - 1 = 0
    await expect(
      instance.connect(owner).withdraw(1)
    ).to.be.reverted;
  });
});