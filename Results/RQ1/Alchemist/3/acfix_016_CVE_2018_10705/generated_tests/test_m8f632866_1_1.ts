import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant m8f632866 test", function () {
  it("should revert when non-owner tries to setOwner", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call setOwner from a non-owner address
    await expect(
      instance.connect(nonOwner).setOwner(nonOwner.address)
    ).to.be.reverted;

    // Verify that owner did not change
    expect(await instance.owner()).to.equal(owner.address);
  });
});