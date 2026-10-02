import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - m44b8a7ea", function () {
  it("should revert when withdrawing after depositing 1 wei due to balance inflation", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei from user
    const tx = await instance.connect(user).deposit({ value: 1 });
    await tx.wait();

    // Attempt to withdraw all - should revert because mutant inflates balance by 1
    await expect(
      instance.connect(user).withdrawAll()
    ).to.be.reverted;
  });
});