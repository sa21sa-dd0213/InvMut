import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - deposit assertion change", function () {
  it("should kill mutant mab66abc5 by depositing a positive amount and expecting no revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit a positive amount - original passes, mutant reverts due to faulty assertion
    const depositAmount = ethers.parseEther("1.0");
    await expect(
      instance.connect(owner).deposit({ value: depositAmount })
    ).to.not.be.reverted;
  });
});