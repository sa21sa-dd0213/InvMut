import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleSuicide mutant test - ma30cfb7c", function () {
  it("should revert when non-owner calls sudicideAnyone", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleSuicide");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the owner (owner is the deployer)
    await expect(
      instance.connect(addr1).sudicideAnyone()
    ).to.be.reverted;
  });
});