import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mfc830a0d by verifying setOwner correctly updates to a non-zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a non-zero address
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Assert that owner was updated to addr1 (original behavior)
    // The mutant would incorrectly set owner to address(0), causing this assertion to fail
    expect(await instance.owner()).to.equal(addr1.address);
  });
});