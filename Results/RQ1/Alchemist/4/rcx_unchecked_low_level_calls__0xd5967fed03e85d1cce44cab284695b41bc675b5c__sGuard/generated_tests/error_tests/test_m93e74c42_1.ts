import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant detection test", function () {
  it("should revert when _tos array is empty in original contract (mutant would not revert)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original requires _tos.length > 0, so empty array should revert
    // Mutant changes to >= 0, which always passes, so empty array would NOT revert
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        [], // empty array - should revert in original, pass in mutant
        100
      )
    ).to.be.reverted;
  });
});