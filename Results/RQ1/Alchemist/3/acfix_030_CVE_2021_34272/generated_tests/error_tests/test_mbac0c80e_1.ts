import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - mbac0c80e", function () {
  it("should revert when non-owner calls transferOwnership (original modifier check)", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to transfer ownership from a non-owner address
    await expect(
      instance.connect(nonOwner).transferOwnership(nonOwner.address)
    ).to.be.reverted;
  });
});