import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mc0298dc3 by verifying transferOwnership sets owner to specified address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially owner should be deployer (the signer who deployed)
    expect(await instance.owner()).to.equal(owner.address);

    // Call transferOwnership with a new owner address (addr1)
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // In the original contract, owner becomes addr1.address
    // In the mutant, owner would become address(this) (contract's own address)
    // This assertion should pass on original but fail on mutant, killing it
    expect(await instance.owner()).to.equal(addr1.address);
  });
});