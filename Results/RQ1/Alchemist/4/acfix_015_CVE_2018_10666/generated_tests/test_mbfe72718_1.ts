import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should set owner to provided address, not to contract itself", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with addr1's address
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Assert that owner is addr1, not the contract address
    expect(await instance.owner()).to.equal(addr1.address);
    // This assertion will fail on the mutant because mutant sets owner = address(this)
    expect(await instance.owner()).to.not.equal(await instance.getAddress());
  });
});