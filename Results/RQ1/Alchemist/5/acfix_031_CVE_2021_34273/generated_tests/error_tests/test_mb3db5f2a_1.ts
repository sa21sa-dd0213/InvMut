import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls transferOwnership", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify non-owner cannot transfer ownership
    await expect(
      instance.connect(nonOwner).transferOwnership(nonOwner.address)
    ).to.be.reverted;

    // Verify owner is still the original deployer
    expect(await instance.owner()).to.equal(owner.address);
  });
});