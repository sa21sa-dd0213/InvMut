import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant m7eacd583 test", function () {
  it("should detect mutant that removes return true from setOwner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner as admin (the original deployer) and capture return value
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();

    // Check that the function returned true (original behavior)
    // For the mutant, the return value will be the default false
    const result = await instance.connect(owner).callStatic.setOwner(addr1.address);
    expect(result).to.equal(true);
  });
});