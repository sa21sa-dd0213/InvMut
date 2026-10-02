import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - transferOwnership without onlyOwner modifier", function () {
  it("should revert when non-owner tries to transfer ownership", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to transfer ownership from a non-owner address
    await expect(
      instance.connect(addr1).transferOwnership(addr1.address)
    ).to.be.reverted;

    // Verify that the owner remains unchanged
    expect(await instance.owner()).to.equal(owner.address);
  });
});