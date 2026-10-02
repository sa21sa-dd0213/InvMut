import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test - mc4012d07", function () {
  it("should revert when _tos array is empty (original contract behavior)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test with empty _tos array - should revert on original, pass on mutant
    await expect(
      instance.transfer(
        owner.address,
        owner.address,
        [],
        []
      )
    ).to.be.reverted;
  });
});