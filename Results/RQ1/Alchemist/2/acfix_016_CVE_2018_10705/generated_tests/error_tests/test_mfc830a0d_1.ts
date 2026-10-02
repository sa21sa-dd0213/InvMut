import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mfc830a0d: verify setOwner actually updates to the provided address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a non-zero address (addr1)
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // If mutant is present, owner would be address(0) instead of addr1.address
    expect(await instance.owner()).to.equal(addr1.address);
  });
});