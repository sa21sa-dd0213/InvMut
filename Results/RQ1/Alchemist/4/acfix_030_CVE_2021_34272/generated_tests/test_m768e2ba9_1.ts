import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should set owner to the provided newOwner address, not to address(0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Transfer ownership to a non-zero address
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // Assert that owner is addr1, not address(0) (which would be the mutant behavior)
    expect(await instance.owner()).to.equal(addr1.address);
  });
});