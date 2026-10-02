import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - deposit assertion operator change", function () {
  it("should succeed on deposit with positive amount for original, but fail on mutant (assert < always reverts)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 wei - this should succeed on original, but on mutant the assert will fail
    const tx = instance.deposit({ value: ethers.parseEther("0.000000000000000001") });
    await expect(tx).to.be.reverted;
  });
});