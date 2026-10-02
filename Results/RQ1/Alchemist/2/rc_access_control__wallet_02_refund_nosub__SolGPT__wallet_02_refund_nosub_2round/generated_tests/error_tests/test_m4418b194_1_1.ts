import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m4418b194 by verifying that deposit correctly records the exact amount sent", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei from addr1
    const oneWei = 1n;
    const tx = await instance.connect(addr1).deposit({ value: oneWei });
    await tx.wait();

    // Withdraw the full balance
    const withdrawTx = await instance.connect(addr1).withdraw(oneWei);
    await withdrawTx.wait();

    // Check that addr1's balance after withdrawal is zero
    // The mutant would have added 2 wei to balance, so withdraw of 1 wei would leave 1 wei stuck.
    // Try withdrawing the remaining 1 wei (if mutant is present) - this should succeed if mutant present
    // But if original, second withdraw should fail because balance is 0
    await expect(
      instance.connect(addr1).withdraw(1n)
    ).to.be.reverted;
  });
});