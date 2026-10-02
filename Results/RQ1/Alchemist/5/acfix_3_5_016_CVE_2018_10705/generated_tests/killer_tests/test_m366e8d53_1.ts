import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should set owner to the provided address when setOwner is called by admin, not to address(0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a non-zero address
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Assert that owner is now addr1, not address(0)
    expect(await instance.owner()).to.equal(addr1.address);
  });
});