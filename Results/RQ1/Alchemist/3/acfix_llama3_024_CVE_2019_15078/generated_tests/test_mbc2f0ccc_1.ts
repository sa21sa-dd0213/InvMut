import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - transferOwnership", function () {
  it("should detect that transferOwnership sets owner to address(0) instead of newOwner", async function () {
    const [owner, newOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner
    expect(await instance.owner()).to.equal(owner.address);

    // Call transferOwnership to transfer to newOwner
    await instance.connect(owner).transferOwnership(newOwner.address);

    // In the original contract, owner would now be newOwner
    // In the mutant, owner is set to address(0)
    // Verify that newOwner CANNOT call owner-only functions (should revert)
    // because the owner is address(0) in the mutant
    await expect(
      instance.connect(newOwner).withdraw()
    ).to.be.reverted;

    // Additionally, verify that even the original owner cannot call owner-only functions
    // since ownership was transferred (in original) or set to zero (in mutant)
    await expect(
      instance.connect(owner).withdraw()
    ).to.be.reverted;
  });
});