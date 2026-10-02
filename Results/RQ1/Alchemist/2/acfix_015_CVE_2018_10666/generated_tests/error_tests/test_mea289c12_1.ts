import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow owner to call setOwner and succeed, killing mutant that uses !=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner should be able to set a new owner - this will revert in the mutant
    // because the mutant requires msg.sender != owner
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Verify the owner was actually changed
    const newOwner = await instance.owner();
    expect(newOwner).to.equal(addr1.address);
  });
});