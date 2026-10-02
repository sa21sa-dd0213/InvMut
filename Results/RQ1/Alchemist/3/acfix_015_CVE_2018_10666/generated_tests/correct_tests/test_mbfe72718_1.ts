import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mbfe72718 by verifying setOwner sets owner to the provided address, not contract itself", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with addr1 as new owner
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // In the original, owner should be addr1
    // In the mutant, owner would be the contract's own address (instance.target)
    expect(await instance.owner()).to.equal(addr1.address);
  });
});