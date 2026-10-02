import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - m1558b1c8", function () {
  it("should kill mutant by calling setOwner from admin address and expecting success", async function () {
    const [admin, addr1] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Admin calls setOwner - should succeed on original, revert on mutant
    const tx = await instance.connect(admin).setOwner(addr1.address);
    await tx.wait();

    // Verify the owner was actually changed to confirm success
    const newOwner = await instance.owner();
    expect(newOwner).to.equal(addr1.address);
  });
});