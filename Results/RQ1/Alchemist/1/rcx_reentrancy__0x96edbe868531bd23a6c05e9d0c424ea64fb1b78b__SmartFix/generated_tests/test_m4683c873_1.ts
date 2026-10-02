import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant test - m4683c873", function () {
  it("should revert when Put is called with msg.value = 0 on mutant (but pass on original)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the contract - no constructor arguments needed for PENNY_BY_PENNY
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First, initialize the contract to enable normal operation
    await instance.Initialized();
    
    // Call Put with 0 value - this should revert on the mutant because 
    // (balance + 0) > balance is false, but would pass on original with >=
    const tx = instance.connect(owner).Put(0, { value: 0 });
    
    // The transaction should revert on the mutant
    await expect(tx).to.be.reverted;
  });
});