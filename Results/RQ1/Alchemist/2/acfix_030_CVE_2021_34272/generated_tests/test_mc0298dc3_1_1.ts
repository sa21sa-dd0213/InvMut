import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant mc0298dc3 - transferOwnership sets owner to contract address", function () {
  it("should kill the mutant by verifying owner is set to newOwner, not contract address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially owner should be deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Transfer ownership to addr1
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // In original, owner becomes addr1; in mutant, owner becomes contract address
    // This assertion will pass on original but fail on mutant
    expect(await instance.owner()).to.equal(addr1.address);
  });
});