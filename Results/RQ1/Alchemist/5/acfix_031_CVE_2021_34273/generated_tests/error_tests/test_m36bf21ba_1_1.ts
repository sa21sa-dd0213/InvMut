import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m36bf21ba by verifying owner is set to newOwner, not address(this)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call transferOwnership with addr1 as newOwner
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // Verify that owner is now addr1 (not the contract's own address)
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
    expect(currentOwner).to.not.equal(await instance.getAddress());
  });
});