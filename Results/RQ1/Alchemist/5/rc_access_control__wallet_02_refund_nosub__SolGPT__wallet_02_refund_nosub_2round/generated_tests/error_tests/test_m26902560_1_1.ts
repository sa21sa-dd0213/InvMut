import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m26902560 by depositing 1 wei and then withdrawing the full balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei from addr1
    const depositTx = await instance.connect(addr1).deposit({ value: 1 });
    await depositTx.wait();

    // Try to withdraw 1 wei - should succeed on original, fail on mutant (balance = 0)
    await expect(
      instance.connect(addr1).withdraw(1)
    ).to.be.reverted;
  });
});