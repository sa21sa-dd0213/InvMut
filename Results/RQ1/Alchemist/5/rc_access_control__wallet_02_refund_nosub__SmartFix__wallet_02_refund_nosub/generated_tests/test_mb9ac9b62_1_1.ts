import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mb9ac9b62 - withdraw with < instead of <=", function () {
  it("should revert when withdrawing exactly the balance due to strict inequality", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 deposits 1 ether
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Withdraw exactly the balance - should succeed on original, revert on mutant
    await expect(
      instance.connect(addr1).withdraw(depositAmount)
    ).to.be.reverted;
  });
});