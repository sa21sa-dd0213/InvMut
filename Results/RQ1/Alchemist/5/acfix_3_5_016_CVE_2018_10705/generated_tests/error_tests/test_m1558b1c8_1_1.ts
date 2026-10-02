import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned - kill mutant m1555b1c8", function () {
  it("should revert when non-admin calls setOwner, but admin should succeed", async function () {
    const [admin, nonAdmin] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Admin should be able to set owner successfully (original behavior)
    await expect(instance.connect(admin).setOwner(nonAdmin.address)).to.not.be.reverted;

    // Non-admin should be rejected (original behavior)
    await expect(instance.connect(nonAdmin).setOwner(admin.address)).to.be.revertedWith(
      "Only admin can call address(this) function"
    );
  });
});