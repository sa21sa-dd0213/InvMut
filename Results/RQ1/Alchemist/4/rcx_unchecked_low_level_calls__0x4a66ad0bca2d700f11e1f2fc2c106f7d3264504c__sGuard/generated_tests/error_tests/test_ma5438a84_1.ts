import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - loop condition change from < to <=", function () {
  it("should kill mutant by causing out-of-bounds array access with single element array", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create arrays with single element to trigger out-of-bounds when i <= length
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token
    
    // This should revert on the mutant because loop runs with i=1 when length=1
    // accessing _tos[1] which is out of bounds
    await expect(
      instance.transfer(recipients, amounts)
    ).to.be.reverted;
  });
});