import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when setOwner is called by admin (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner from the admin (which is msg.sender in constructor, i.e., owner)
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();

    // The original function returns true; the mutant does not return anything
    // We expect the return value to be true (this will fail on the mutant)
    const result = await instance.connect(owner).callStatic.setOwner(addr1.address);
    expect(result).to.equal(true);
  });
});