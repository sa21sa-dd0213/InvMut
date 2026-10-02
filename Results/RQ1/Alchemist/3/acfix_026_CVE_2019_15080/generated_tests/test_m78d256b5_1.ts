import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m78d256b5 by verifying owner is set to _newOwner, not address(this)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially, owner should be the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call transferOwnership with addr1's address
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // In the original, owner becomes addr1. In the mutant, owner becomes the contract itself.
    // This assertion will pass on original, fail on mutant (killing it)
    expect(await instance.owner()).to.equal(addr1.address);
  });
});