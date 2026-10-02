import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mbfe72718 by verifying owner is set to provided address, not contract itself", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with addr1 as the new owner
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // In original contract, owner should be addr1
    // In mutant, owner would be address(this) - the contract's own address
    // This assertion will pass on original and fail on mutant
    expect(await instance.owner()).to.equal(addr1.address);
  });
});