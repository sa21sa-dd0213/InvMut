import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant detection - setOwner replacement", function () {
  it("should detect mutant that sets owner to address(this) instead of _owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a new address (addr1)
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // In the original contract, owner should be addr1
    // In the mutant, owner would be the contract's own address
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
    // The mutant will fail here because currentOwner will be instance.target (contract address)
  });
});