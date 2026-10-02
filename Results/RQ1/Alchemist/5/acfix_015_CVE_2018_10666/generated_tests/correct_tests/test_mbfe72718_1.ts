import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant mbfe72718 - setOwner sets owner to address(this) instead of _owner", function () {
  it("should detect the mutant by verifying owner is set to the provided address, not the contract address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with addr1 as the new owner
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // In the original, owner becomes addr1
    // In the mutant, owner becomes address(this) (the contract's own address)
    // So we check that owner is addr1 - if mutant is present, this assertion fails
    expect(await instance.owner()).to.equal(addr1.address);
  });
});