import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant kill test - m6250521d", function () {
  it("should revert when withdrawing more than balance on original, but allow on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 wei from addr1
    const depositTx = await instance.connect(addr1).deposit({ value: 1 });
    await depositTx.wait();

    // Attempt to withdraw 100 wei (more than balance of 1 wei)
    // On the original contract this should revert due to the require check
    // On the mutant (which removed the require) this should succeed (overdraft)
    await expect(
      instance.connect(addr1).withdraw(100)
    ).to.be.reverted;
  });
});