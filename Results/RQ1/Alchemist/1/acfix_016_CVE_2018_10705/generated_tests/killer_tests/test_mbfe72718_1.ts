import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mbfe72718: setOwner sets owner to address(this) instead of _owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with addr1 as the new owner
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // In the original contract, owner should be addr1
    // In the mutant, owner would be the contract's own address (instance.target)
    // So this assertion kills the mutant
    expect(await instance.owner()).to.equal(addr1.address);
  });
});