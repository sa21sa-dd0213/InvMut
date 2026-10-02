import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test for deposit >= change", function () {
  it("should revert when depositing 0 wei (kills mutant that uses >= instead of >)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 0 wei - should revert in original (assert fails),
    // but would succeed in mutant (assert passes with >=)
    await expect(
      instance.connect(owner).deposit({ value: 0 })
    ).to.be.reverted;
  });
});