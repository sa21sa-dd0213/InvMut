import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow owner to call transferOwnership, but mutant should revert for owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner calls transferOwnership - should succeed in original, revert in mutant
    await expect(
      instance.connect(owner).transferOwnership(addr1.address)
    ).to.not.be.reverted;

    // Verify ownership was transferred in original (optional check)
    const newOwner = await instance.owner();
    expect(newOwner).to.equal(addr1.address);
  });
});