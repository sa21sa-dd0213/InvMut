import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m8c117986 by verifying transferOwnership sets owner to the new address, not address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    // Deploy with owner as initial owner (no constructor arguments needed for this contract)
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Transfer ownership to addr1
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // Verify owner is addr1, not address(0) (mutant would set to address(0))
    const newOwner = await instance.owner();
    expect(newOwner).to.equal(addr1.address);
  });
});