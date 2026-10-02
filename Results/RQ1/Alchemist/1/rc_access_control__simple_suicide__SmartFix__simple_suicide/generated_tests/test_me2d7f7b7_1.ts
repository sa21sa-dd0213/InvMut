import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleSuicide mutant test", function () {
  it("should kill mutant me2d7f7b7 by calling sudicideAnyone from owner and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleSuicide");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner calls sudicideAnyone - should succeed on original, revert on mutant
    const tx = await instance.connect(owner).sudicideAnyone();
    await expect(tx).to.not.be.reverted;
  });
});