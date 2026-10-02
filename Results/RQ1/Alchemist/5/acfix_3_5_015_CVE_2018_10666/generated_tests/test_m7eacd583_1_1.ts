import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m7eacd583 by asserting return value of setOwner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner from admin (the deployer) and check return value
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();

    // The original function returns true; the mutant removes the return statement,
    // causing a compilation error or undefined behavior. This test will fail on the mutant.
    const result = await instance.connect(owner).setOwner.staticCall(addr1.address);
    expect(result).to.equal(true);
  });
});