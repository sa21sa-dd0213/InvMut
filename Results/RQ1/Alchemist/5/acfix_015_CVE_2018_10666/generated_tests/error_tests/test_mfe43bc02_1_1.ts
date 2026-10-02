import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when setOwner is called by the owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner from the owner account
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Check that the owner was actually updated (indirect verification)
    const newOwner = await instance.owner();
    expect(newOwner).to.equal(addr1.address);
  });
});