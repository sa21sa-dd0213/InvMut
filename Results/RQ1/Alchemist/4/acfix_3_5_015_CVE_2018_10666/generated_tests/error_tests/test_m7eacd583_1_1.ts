import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - m7eacd583", function () {
  it("should return true when setOwner is called by admin", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner from the admin (the original deployer) and capture the return value
    const result = await instance.connect(owner).setOwner.staticCall(addr1.address);
    expect(result).to.equal(true);
    
    // Execute the actual transaction to change the owner
    await instance.connect(owner).setOwner(addr1.address);
  });
});