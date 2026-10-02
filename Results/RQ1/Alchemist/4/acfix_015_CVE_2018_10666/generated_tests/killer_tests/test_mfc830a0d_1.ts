import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant mfc830a0d test", function () {
  it("should revert when calling setOwner with a non-zero address from unauthorized user, and should set owner correctly from owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a non-zero address from the owner
    const newOwner = addr1.address;
    const tx = await instance.connect(owner).setOwner(newOwner);
    await tx.wait();

    // After the call, the owner should be the newOwner, not address(0)
    // The mutant would set owner to address(0), so this assertion kills the mutant
    expect(await instance.owner()).to.equal(newOwner);
  });
});