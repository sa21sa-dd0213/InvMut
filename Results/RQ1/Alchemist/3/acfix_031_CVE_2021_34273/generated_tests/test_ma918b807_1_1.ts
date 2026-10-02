import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant ma918b807 test", function () {
  it("should revert when non-owner calls transferOwnership (mutant removes require)", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // non-owner attempts to call transferOwnership - should revert on original, succeed on mutant
    await expect(
      instance.connect(nonOwner).transferOwnership(nonOwner.address)
    ).to.be.reverted;
  });
});