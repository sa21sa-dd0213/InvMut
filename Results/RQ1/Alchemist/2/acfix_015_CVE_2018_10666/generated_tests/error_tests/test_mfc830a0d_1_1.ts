import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should correctly update owner to the provided address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a new address
    const newOwner = addr1.address;
    const tx = await instance.connect(owner).setOwner(newOwner);
    await tx.wait();

    // Assert that owner is set to the provided address, not address(0)
    expect(await instance.owner()).to.equal(newOwner);
  });
});