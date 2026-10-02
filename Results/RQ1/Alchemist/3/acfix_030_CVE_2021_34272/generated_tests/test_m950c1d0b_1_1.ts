import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant kill test", function () {
  it("should revert when owner calls transferOwnership due to mutated modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the mutant, onlyOwner modifier uses != instead of ==
    // So the owner calling transferOwnership will revert
    await expect(
      instance.connect(owner).transferOwnership(addr1.address)
    ).to.be.reverted;

    // Verify that a non-owner can successfully call it (mutant behavior)
    await instance.connect(addr1).transferOwnership(addr1.address);
    expect(await instance.owner()).to.equal(addr1.address);
  });
});