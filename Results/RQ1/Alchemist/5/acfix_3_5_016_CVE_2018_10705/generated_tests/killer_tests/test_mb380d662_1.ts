import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mb380d662: setOwner sets owner to address(this) instead of _owner argument", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner with addr1's address
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Check that owner was set to addr1, not the contract itself
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
  });
});