import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant kill test - m1558b1c8", function () {
  it("should revert when admin calls setOwner (mutant uses != instead of ==)", async function () {
    const [admin, addr1] = await ethers.getSigners();
    
    // Deploy contract - constructor doesn't take arguments in Owned
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Admin should be able to call setOwner in original, but mutant will revert
    // because msg.sender != admin will be false (they are equal)
    await expect(
      instance.connect(admin).setOwner(addr1.address)
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});