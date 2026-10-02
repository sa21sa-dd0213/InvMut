import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant detection - adjustAdminAccess", function () {
  it("should detect mutant that inverts owner check in adjustAdminAccess", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // In the original contract, the owner can call adjustAdminAccess to grant admin access
    // In the mutant (msg.sender != _ownerAddress), the owner's call will revert
    // Therefore, this call should revert in the mutant but succeed in the original
    await expect(
      instance.connect(owner).adjustAdminAccess(addr1.address, true)
    ).to.not.be.reverted;

    // Verify that addr1 was actually granted admin access
    const isAdmin = await instance.isAdmin(addr1.address);
    expect(isAdmin).to.equal(true);
  });
});