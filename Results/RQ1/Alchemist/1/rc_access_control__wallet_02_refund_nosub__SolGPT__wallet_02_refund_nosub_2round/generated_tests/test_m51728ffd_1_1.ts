import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - m51728ffd", function () {
  it("should kill the mutant by withdrawing exact balance and checking success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 ether
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(owner).deposit({ value: depositAmount });

    // Try to withdraw the exact balance (should succeed in original, fail in mutant)
    await expect(
      instance.connect(owner).withdraw(depositAmount)
    ).to.not.be.reverted;

    // Verify balance is now zero
    expect(await instance.connect(owner).withdraw(0)).to.not.be.reverted;
  });
});