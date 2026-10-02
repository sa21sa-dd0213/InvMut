import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when owner calls setOwner and assert the return value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner as the owner and capture the return value
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();

    // For functions that return a value, we need to check the transaction result
    // In ethers v6, we can call the function directly to get the return value
    const result = await instance.connect(owner).setOwner.staticCall(addr1.address);
    
    // The original returns true; the mutant (without return true) returns false
    expect(result).to.equal(true);
  });
});