import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - mutant kill test for transferOwnership", function () {
  it("should kill mutant mc80513ee by verifying ownership transfer to non-zero address", async function () {
    const [owner, newOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call transferOwnership with a valid non-zero address
    const tx = await instance.connect(owner).transferOwnership(newOwner.address);
    await tx.wait();

    // In the original contract, ownership should be transferred to newOwner
    // In the mutant (if false), ownership remains with original owner
    // Therefore, this assertion should pass on original and fail on mutant
    expect(await instance.owner()).to.equal(newOwner.address);
  });
});