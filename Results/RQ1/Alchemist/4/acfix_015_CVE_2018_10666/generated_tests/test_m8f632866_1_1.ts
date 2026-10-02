import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - kill m8f632866", function () {
  it("should revert when non-owner calls setOwner", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Mutant removes onlyOwner modifier, so non-owner should succeed (mutant is live)
    // But original would revert. We expect revert to kill the mutant.
    await expect(
      instance.connect(nonOwner).setOwner(nonOwner.address)
    ).to.be.reverted;
  });
});