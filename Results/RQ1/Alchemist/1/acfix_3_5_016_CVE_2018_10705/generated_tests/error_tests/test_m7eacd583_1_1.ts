import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true from setOwner when called by admin", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner as the admin (which is msg.sender in constructor, so owner)
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();

    // Check the return value from the transaction - should be true
    const returnValue = await instance.connect(owner).setOwner.staticCall(addr1.address);
    expect(returnValue).to.equal(true);
  });
});