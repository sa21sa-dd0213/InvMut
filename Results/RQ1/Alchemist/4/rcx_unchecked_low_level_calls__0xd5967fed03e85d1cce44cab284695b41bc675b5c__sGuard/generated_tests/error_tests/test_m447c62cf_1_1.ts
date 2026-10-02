import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m447c62cf test", function () {
  it("should revert when iterating beyond array length due to off-by-one error", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a _tos array with exactly 1 element to trigger the off-by-one bug
    const tos = [owner.address];
    const value = ethers.parseEther("1");

    // The original loop (i < _tos.length) would succeed with 1 element
    // The mutant (i <= _tos.length) will try to access index 1 which is out of bounds and revert
    await expect(
      instance.transfer(owner.address, owner.address, tos, value)
    ).to.be.reverted;
  });
});