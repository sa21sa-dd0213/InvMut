import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - m43b1cf64", function () {
  it("should detect mutant that adds 1 wei extra on deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 ether from addr1
    const depositAmount = ethers.parseEther("1");
    const txDeposit = await instance.connect(addr1).deposit({ value: depositAmount });
    await txDeposit.wait();

    // Try to withdraw exactly the deposited amount
    // On original contract this succeeds, on mutant it will fail because
    // balance recorded is depositAmount + 1 wei, but contract only has depositAmount
    await expect(
      instance.connect(addr1).withdraw(depositAmount)
    ).to.be.reverted;
  });
});