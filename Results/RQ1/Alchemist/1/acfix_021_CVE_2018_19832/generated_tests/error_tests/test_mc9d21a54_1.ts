import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant mc9d21a54", function () {
  it("should kill the mutant by verifying transferOwnership correctly assigns owner to new address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially owner should be deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Transfer ownership to addr1
    await instance.connect(owner).transferOwnership(addr1.address);

    // In original contract, owner should now be addr1
    // In mutant, owner would be address(0) instead
    // Verify the owner is addr1 (mutant will fail this assertion)
    expect(await instance.owner()).to.equal(addr1.address);

    // Confirm addr1 can now call onlyOwner functions
    // If mutant set owner to address(0), this call will revert
    await expect(instance.connect(addr1).withdraw()).to.not.be.reverted;
  });
});