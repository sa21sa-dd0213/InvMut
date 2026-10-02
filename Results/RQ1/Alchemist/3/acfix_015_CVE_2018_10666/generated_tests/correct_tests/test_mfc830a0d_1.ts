import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - mfc830a0d", function () {
  it("should kill mutant by verifying setOwner correctly updates owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a non-zero address
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Assert that owner was updated to addr1 (mutant sets to address(0) instead)
    expect(await instance.owner()).to.equal(addr1.address);
  });
});