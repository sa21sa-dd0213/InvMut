import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - m8c117986", function () {
  it("should kill mutant by verifying transferOwnership sets the correct new owner", async function () {
    const [owner, newOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call transferOwnership with a valid non-zero address
    const tx = await instance.connect(owner).transferOwnership(newOwner.address);
    await tx.wait();

    // Verify the owner was updated to the expected address, not address(0)
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(newOwner.address);
  });
});