import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Wallet mutant test - m9faf225c", function () {
  it("should revert when depositing 0 ether (detects >= vs > mutant)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 0 ether - should revert in original but pass in mutant
    await expect(
      instance.connect(owner).deposit({ value: 0 })
    ).to.be.reverted;
  });
});