import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should set owner to the provided address, not the contract itself", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a new address (addr1)
    await instance.connect(owner).setOwner(addr1.address);

    // Assert that owner is addr1, not the contract's own address
    expect(await instance.owner()).to.equal(addr1.address);
    expect(await instance.owner()).to.not.equal(await instance.getAddress());
  });
});