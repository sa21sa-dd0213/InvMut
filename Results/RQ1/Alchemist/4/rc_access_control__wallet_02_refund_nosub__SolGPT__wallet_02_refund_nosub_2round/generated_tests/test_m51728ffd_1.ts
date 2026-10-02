import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m51728ffd - withdraw <= vs <", function () {
  it("should allow withdrawing full balance (original behavior) and kill mutant that reverts on equal amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 deposits 1 ether
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // addr1 withdraws exact full balance (1 ether)
    await expect(
      instance.connect(addr1).withdraw(depositAmount)
    ).to.not.be.reverted;

    // Verify balance is now zero
    // We can check by trying to withdraw again - should revert with insufficient balance
    await expect(
      instance.connect(addr1).withdraw(1)
    ).to.be.reverted;
  });
});