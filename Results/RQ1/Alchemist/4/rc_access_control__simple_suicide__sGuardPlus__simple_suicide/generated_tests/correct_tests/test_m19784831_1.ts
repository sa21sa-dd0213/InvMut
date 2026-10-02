import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleSuicide mutant kill test", function () {
  it("should revert when non-owner calls sudicideAnyone", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleSuicide");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call sudicideAnyone from a non-owner address
    await expect(
      instance.connect(addr1).sudicideAnyone()
    ).to.be.reverted;
  });
});