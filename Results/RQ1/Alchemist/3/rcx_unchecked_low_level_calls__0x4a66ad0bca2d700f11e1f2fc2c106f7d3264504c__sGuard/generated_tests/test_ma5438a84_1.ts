import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - ma5438a84", function () {
  it("should kill mutant by passing empty _tos array (revert on out-of-bounds)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Empty array should work on original (loop doesn't execute)
    // but should revert on mutant (i <= 0 leads to out-of-bounds access)
    await expect(
      instance.connect(owner).transfer([], [])
    ).to.be.reverted;
  });
});