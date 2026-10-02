import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleSuicide mutant test - ma30cfb7c", function () {
  it("should revert when non-owner calls sudicideAnyone", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleSuicide");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract requires that msg.sender equals smartfix_owner
    // The mutant removes this require, so calling from a non-owner would not revert
    // This test should fail (kill the mutant) because the mutant allows the call
    // while we expect a revert
    await expect(
      instance.connect(addr1).sudicideAnyone()
    ).to.be.reverted;
  });
});