import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant detection - m2c91dcb1", function () {
  it("should kill mutant by calling Deposit with 0 value - passes on original, fails on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call Deposit with 0 ether - should succeed on original but revert on mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: 0
      })
    ).to.not.be.reverted;
  });
});