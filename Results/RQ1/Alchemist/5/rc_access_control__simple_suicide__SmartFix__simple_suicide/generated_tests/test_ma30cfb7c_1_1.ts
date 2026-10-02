import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleSuicide mutant detection - ma30cfb7c", function () {
  it("should revert when non-owner calls sudicideAnyone", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleSuicide");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call sudicideAnyone from a non-owner address
    // The original contract has a require that only allows the owner (smartfix_owner)
    // to call this function. The mutant removes this require, so it would succeed.
    // A passing test on the original should revert here.
    await expect(
      instance.connect(nonOwner).sudicideAnyone()
    ).to.be.reverted;
  });
});