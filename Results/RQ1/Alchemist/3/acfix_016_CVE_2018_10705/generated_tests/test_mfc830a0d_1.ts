import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - mfc830a0d", function () {
  it("should set owner to the provided address, not to address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a non-zero address
    const newOwner = addr1.address;
    await instance.connect(owner).setOwner(newOwner);

    // Assert owner is set to the provided address, not address(0)
    expect(await instance.owner()).to.equal(newOwner);
  });
});