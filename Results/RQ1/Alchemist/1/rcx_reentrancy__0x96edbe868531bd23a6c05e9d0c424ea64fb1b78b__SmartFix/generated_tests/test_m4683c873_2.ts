import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant test - m4683c873", function () {
  it("should revert when Put is called with msg.value = 0 after a prior deposit (mutant kills, original passes)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract to enable operations
    await instance.Initialized();
    
    // First deposit: send 1 wei to create a positive balance
    await instance.connect(owner).Put(100, { value: 1 });
    
    // Now call Put with 0 value - this should pass on original (balance + 0 >= balance is true)
    // but revert on mutant (balance + 0 > balance is false)
    const tx = instance.connect(owner).Put(0, { value: 0 });
    
    await expect(tx).to.be.reverted;
  });
});