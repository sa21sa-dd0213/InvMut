import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant detection - loop bound", function () {
  it("should revert on mutant when array has one element due to out-of-bounds access", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments for this contract)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare parameters: single recipient in array
    const recipients = [to.address];
    const value = 1; // 1 token
    const decimals = 18;
    
    // This should succeed on original (loop runs once) 
    // but revert on mutant (loop runs twice, accesses out-of-bounds)
    await expect(
      instance.transfer(from.address, owner.address, recipients, value, decimals)
    ).to.be.reverted;
  });
});