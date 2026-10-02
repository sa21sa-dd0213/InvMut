import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls a function protected by onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract doesn't have an explicit onlyOwner function besides setOwner which uses onlyAdmin
    // We need to check the onlyOwner modifier usage - it's not used in any external function in the provided code
    // However, we can test the modifier by attempting to call a function that uses it
    // Since the onlyOwner modifier is defined but not used in any function in the provided code,
    // we test the setOwner function which uses onlyAdmin modifier
    // The mutant removes the require from onlyOwner modifier, but since no function uses it,
    // we need to verify the onlyAdmin modifier still works correctly
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.revertedWith("Only admin can call address(this) function");
  });

  it("should allow admin to set owner successfully", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    await instance.connect(owner).setOwner(addr1.address);
    expect(await instance.owner()).to.equal(addr1.address);
  });
});