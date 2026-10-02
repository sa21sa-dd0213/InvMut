import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant m78d256b5 test", function () {
  it("should kill the mutant by verifying transferOwnership correctly changes owner to new address", async function () {
    const [owner, newOwner] = await ethers.getSigners();

    // Deploy Owned contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call transferOwnership with a new address from the owner
    const tx = await instance.connect(owner).transferOwnership(newOwner.address);
    await tx.wait();

    // Assert: on original, owner becomes newOwner; on mutant, owner becomes contract address
    expect(await instance.owner()).to.equal(newOwner.address);
  });
});