import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned mutant m8c117986 test", function () {
  it("should kill mutant that sets owner to address(0) instead of _newOwner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Transfer ownership to addr1
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // Verify owner is addr1 (not address(0))
    expect(await instance.owner()).to.equal(addr1.address);
  });
});