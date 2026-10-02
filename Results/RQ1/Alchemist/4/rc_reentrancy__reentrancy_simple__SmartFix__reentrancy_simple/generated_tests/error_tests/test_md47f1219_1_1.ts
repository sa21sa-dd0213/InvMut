import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - md47f1219", function () {
  it("should detect the mutant by calling addToBalance with 0 value when user has non-zero balance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First add some balance to the owner
    const depositAmount = ethers.parseEther("1");
    await instance.connect(owner).addToBalance({ value: depositAmount });

    // Now attempt to add 0 value - should succeed on original, fail on mutant
    await expect(
      instance.connect(owner).addToBalance({ value: 0 })
    ).to.be.reverted;
  });
});