import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mc0298dc3 by verifying transferOwnership sets owner to provided address, not contract address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Confirm initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Transfer ownership to addr1
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // Verify owner was set to addr1 (not address(this) which would be the contract)
    expect(await instance.owner()).to.equal(addr1.address);
  });
});