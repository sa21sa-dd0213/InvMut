import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - mfd71fa3c", function () {
  it("should detect mutant by verifying withdraw with amount less than balance reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 100 wei from addr1
    const depositAmount = ethers.parseEther("100");
    const depositTx = await instance.connect(addr1).deposit({ value: depositAmount });
    await depositTx.wait();

    // Try to withdraw 30 wei (less than full balance) - should succeed on original, revert on mutant
    const withdrawAmount = ethers.parseEther("30");
    await expect(
      instance.connect(addr1).withdraw(withdrawAmount)
    ).to.be.reverted;
  });
});