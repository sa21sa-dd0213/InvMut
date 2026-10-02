import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant test", function () {
  it("should revert when non-owner calls onlyOwner function after modifier is removed", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    
    // Deploy contract - no constructor arguments needed
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First, verify owner can call onlyOwner function successfully
    await expect(
      instance.connect(owner).transferOwnership(nonOwner.address)
    ).to.not.be.reverted;
    
    // Transfer ownership back to original owner for consistency
    await expect(
      instance.connect(nonOwner).transferOwnership(owner.address)
    ).to.not.be.reverted;
    
    // Now test that non-owner should NOT be able to call onlyOwner function
    // In the original contract, this would revert, but the mutant removes the check
    // so it will succeed - we expect it to fail the test
    await expect(
      instance.connect(nonOwner).transferOwnership(addr1.address)
    ).to.be.reverted;
  });
});