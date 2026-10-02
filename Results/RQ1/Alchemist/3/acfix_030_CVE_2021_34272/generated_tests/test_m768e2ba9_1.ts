import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6)", function () {
  it("should kill mutant m768e2ba9 by verifying transferOwnership sets correct new owner", async function () {
    const [owner, newOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial owner should be deployer (owner)
    expect(await instance.owner()).to.equal(owner.address);

    // Transfer ownership to newOwner
    const tx = await instance.connect(owner).transferOwnership(newOwner.address);
    await tx.wait();

    // Assert owner is set to newOwner, not address(0)
    expect(await instance.owner()).to.equal(newOwner.address);
  });
});