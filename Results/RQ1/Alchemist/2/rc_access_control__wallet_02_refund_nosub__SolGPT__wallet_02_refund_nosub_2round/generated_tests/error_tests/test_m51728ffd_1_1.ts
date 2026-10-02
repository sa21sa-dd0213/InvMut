import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m51728ffd - withdraw with < instead of <=", function () {
  it("should revert when withdrawing exact balance due to mutant changing <= to <", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 100 wei from addr1
    const depositAmount = 100n;
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Attempt to withdraw exactly the deposited amount
    // In the original contract this should succeed, but the mutant reverts
    await expect(
      instance.connect(addr1).withdraw(depositAmount)
    ).to.be.reverted;

    // Verify balance is still intact (withdrawal failed)
    // Note: Since we cannot read balances directly (no getter), we check by attempting another withdrawal
    // This confirms the mutant behavior
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(depositAmount);
  });
});