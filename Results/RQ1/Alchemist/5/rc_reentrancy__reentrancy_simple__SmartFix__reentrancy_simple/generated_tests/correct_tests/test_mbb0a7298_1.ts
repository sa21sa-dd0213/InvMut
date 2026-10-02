import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mbb0a7298 test", function () {
  it("should succeed on zero-value deposit in original, but mutant should revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to addToBalance with msg.value = 0
    // Original contract allows this (0 >= 0 is true)
    // Mutant reverts because 0 > 0 is false
    await expect(
      instance.connect(owner).addToBalance({ value: 0 })
    ).to.not.be.reverted;
  });
});