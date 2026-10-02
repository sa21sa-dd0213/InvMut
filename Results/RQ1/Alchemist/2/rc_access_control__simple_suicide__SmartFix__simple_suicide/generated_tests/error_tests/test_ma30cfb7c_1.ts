import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleSuicide mutant ma30cfb7c test", function () {
  it("should revert when non-owner calls sudicideAnyone", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleSuicide");
    // Deploy with constructor argument - smartfix_owner is set to msg.sender (owner)
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the owner, so the original require should revert
    // The mutant removes the require, so this call would succeed on mutant
    await expect(
      instance.connect(addr1).sudicideAnyone()
    ).to.be.reverted;
  });
});