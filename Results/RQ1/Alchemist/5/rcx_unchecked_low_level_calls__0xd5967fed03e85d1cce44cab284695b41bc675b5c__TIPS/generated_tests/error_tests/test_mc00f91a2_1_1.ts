import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mc00f91a2 test", function () {
  it("should revert when called with empty _tos array", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's transfer function requires _tos.length > 0
    // Mutant changes to >= 0, which would allow empty array
    // Test should pass on original (revert) but fail on mutant (no revert)
    await expect(
      instance.transfer(
        owner.address,
        owner.address,
        [], // empty array
        100
      )
    ).to.be.reverted;
  });
});