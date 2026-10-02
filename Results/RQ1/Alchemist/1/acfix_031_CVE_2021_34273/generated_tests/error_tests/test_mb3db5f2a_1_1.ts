import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - remove onlyOwner modifier from transferOwnership", function () {
  it("should revert when non-owner calls transferOwnership on original contract, but allow it on mutant", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Non-owner attempts to transfer ownership - should revert with original modifier
    await expect(
      instance.connect(nonOwner).transferOwnership(nonOwner.address)
    ).to.be.reverted;
  });
});