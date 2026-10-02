import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - kill ma5807a11", function () {
  it("should revert when non-owner calls a function protected by onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Admin (owner) can call setOwner
    await expect(instance.connect(owner).setOwner(addr1.address)).to.not.be.reverted;

    // Now addr1 is the owner, but admin is still the original owner
    // Try calling setOwner from addr1 - should fail because addr1 is not admin
    await expect(
      instance.connect(addr1).setOwner(owner.address)
    ).to.be.revertedWith("Only admin can call address(this) function");

    // Verify the contract deploys and basic functionality works
    const factory2 = await ethers.getContractFactory("Owned");
    const contract2 = await factory2.deploy();
    await contract2.waitForDeployment();

    expect(await contract2.owner()).to.equal(owner.address);
  });
});