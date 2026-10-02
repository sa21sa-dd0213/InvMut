import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned mutant test - m8f632866", function () {
  it("should revert when non-owner calls setOwner (detects missing onlyOwner modifier)", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Original contract reverts when non-owner calls setOwner; mutant allows it
    await expect(
      instance.connect(nonOwner).setOwner(nonOwner.address)
    ).to.be.reverted;
  });
});