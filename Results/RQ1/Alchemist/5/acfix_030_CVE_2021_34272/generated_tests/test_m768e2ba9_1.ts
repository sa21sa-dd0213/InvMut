import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - m768e2ba9", function () {
  it("should detect mutant that sets owner to address(0) instead of newOwner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Transfer ownership to addr1
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // Check that owner was updated to addr1 (not address(0))
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
  });
});