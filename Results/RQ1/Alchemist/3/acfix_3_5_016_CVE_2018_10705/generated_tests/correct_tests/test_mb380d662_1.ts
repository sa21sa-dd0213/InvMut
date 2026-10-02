import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mb380d662 by verifying setOwner sets owner to provided address, not address(this)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially, owner should be the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with addr1's address
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // On original, owner becomes addr1. On mutant, owner becomes contract address.
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
  });
});