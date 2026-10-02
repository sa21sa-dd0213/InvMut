import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - empty array", function () {
  it("should revert when _tos array is empty in original but not in mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Empty array should cause revert due to require(_tos.length > 0)
    await expect(
      instance.transfer([], [])
    ).to.be.reverted;
  });
});