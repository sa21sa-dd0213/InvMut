import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant that sets owner to address(this) instead of _owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner with a specific new owner address (addr1)
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Verify that owner is set to addr1, not the contract's own address
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
  });
});