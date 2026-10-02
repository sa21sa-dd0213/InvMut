import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m77397e75", function () {
  it("should revert when called from unauthorized address in original, but pass in mutant", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup test data - empty arrays would fail the _tos.length > 0 check
    const recipients = [unauthorized.address];
    const amounts = [1]; // 1 token unit
    
    // Attempt to call transfer from unauthorized address
    // In original: should revert due to require(msg.sender == 0x9797...)
    // In mutant: should succeed (no access control check)
    await expect(
      instance.connect(unauthorized).transfer(recipients, amounts)
    ).to.be.reverted; // This assertion will pass on original but fail on mutant
  });
});