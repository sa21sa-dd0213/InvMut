import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - m26bf4123", function () {
  it("should revert when non-owner calls owned() due to onlyOwner modifier", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Non-owner should not be able to call owned() - it should revert
    await expect(
      instance.connect(nonOwner).owned()
    ).to.be.revertedWith(""); // No specific revert message in the modifier
  });
});