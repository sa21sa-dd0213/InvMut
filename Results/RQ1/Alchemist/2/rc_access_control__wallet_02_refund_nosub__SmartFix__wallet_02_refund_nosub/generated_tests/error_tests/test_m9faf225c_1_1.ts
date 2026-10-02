import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m9faf225c detection test", function () {
  it("should revert when depositing zero ether in original but succeed in mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 0 ether - should revert in original due to strict > check
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});