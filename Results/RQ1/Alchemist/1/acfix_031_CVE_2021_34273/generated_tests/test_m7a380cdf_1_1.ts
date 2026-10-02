import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should transfer ownership to the specified newOwner address, not to address(0)", async function () {
    const [owner, newOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially, owner should be the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Transfer ownership to newOwner
    const tx = await instance.connect(owner).transferOwnership(newOwner.address);
    await tx.wait();

    // Verify owner is the newOwner, not address(0) — this will kill the mutant
    expect(await instance.owner()).to.equal(newOwner.address);
  });
});