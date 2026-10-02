import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls adjustAdminAccess - kills mutant m6d0fd240", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, addr1.address);
    await instance.waitForDeployment();

    // Non-owner tries to adjust admin access - should revert with original require
    await expect(
      instance.connect(addr2).adjustAdminAccess(addr2.address, true)
    ).to.be.reverted;

    // Owner can successfully adjust admin access
    await expect(
      instance.connect(owner).adjustAdminAccess(addr2.address, true)
    ).to.not.be.reverted;

    // Verify the admin access was actually set
    expect(await instance.isAdmin(addr2.address)).to.equal(true);
  });
});