import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m1f4921f5 detection", function () {
  it("should revert when called from an address numerically less than the authorized address in the original, but pass on the mutant", async function () {
    // Get signers
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed based on the code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create test data: at least one recipient with a non-zero amount
    const recipients = [unauthorized.address];
    const amounts = [1]; // 1 wei, valid since 1 * 1e18 / 1 == 1e18
    
    // The unauthorized address (0x...c9) is numerically less than the authorized address (0x9797...c9)
    // This should revert in the original contract but succeed in the mutant
    await expect(
      instance.connect(unauthorized).transfer(recipients, amounts)
    ).to.be.reverted;
  });
});