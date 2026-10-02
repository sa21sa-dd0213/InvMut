import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant detection - mbfe72718", function () {
  it("should kill the mutant by verifying setOwner assigns the passed address, not address(this)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner with addr1's address
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // The owner should be addr1.address, not the contract's own address
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
  });
});