import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant m8f632866 - kill test", function () {
  it("should revert when non-owner tries to call setOwner", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Non-owner attempts to set owner - should revert in original, succeed in mutant
    await expect(
      instance.connect(nonOwner).setOwner(nonOwner.address)
    ).to.be.reverted;
  });
});