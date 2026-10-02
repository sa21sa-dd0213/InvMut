import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant mc3469b23 test", function () {
  it("should revert when non-owner tries to transfer ownership (original behavior)", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Non-owner tries to transfer ownership - should revert in original
    await expect(
      instance.connect(nonOwner).transferOwnership(nonOwner.address)
    ).to.be.reverted;

    // Verify owner did not change
    expect(await instance.owner()).to.equal(owner.address);
  });
});