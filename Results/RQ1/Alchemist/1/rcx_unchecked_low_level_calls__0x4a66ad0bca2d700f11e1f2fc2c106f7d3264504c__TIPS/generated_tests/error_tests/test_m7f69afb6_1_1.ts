import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - access control removal", function () {
  it("should revert when called from unauthorized address (kills mutant that removed require check)", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare test data: valid addresses and values
    const tos = [unauthorized.address];
    const values = [1]; // 1 token (will be multiplied by 1e18 in contract)
    
    // Call from unauthorized address - should revert on original, pass on mutant
    await expect(
      instance.connect(unauthorized).transfer(tos, values)
    ).to.be.reverted;
  });
});