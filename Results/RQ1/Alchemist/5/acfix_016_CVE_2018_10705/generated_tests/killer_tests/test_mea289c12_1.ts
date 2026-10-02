import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow owner to set a new owner (kills mutant where require(msg.sender != owner))", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner calls setOwner with a new address - should succeed on original
    // but will revert on mutant because mutant requires msg.sender != owner
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Verify the owner was actually changed
    const newOwner = await instance.owner();
    expect(newOwner).to.equal(addr1.address);
  });
});