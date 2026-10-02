import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleSuicide mutant kill test", function () {
  it("should revert when owner calls sudicideAnyone after mutation (== replaced with !=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy SimpleSuicide - no constructor arguments needed as per the contract
    const Factory = await ethers.getContractFactory("SimpleSuicide");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify owner is set correctly
    expect(await instance.smartfix_owner()).to.equal(owner.address);
    
    // Original: owner can call successfully (== check)
    // Mutant: owner will be reverted (!= check blocks owner)
    // Therefore, calling from owner should succeed on original but fail on mutant
    await expect(
      instance.connect(owner).sudicideAnyone()
    ).to.not.be.reverted;
    
    // Also verify that a non-owner cannot call on original but can on mutant
    // This is not strictly needed but helps confirm the mutation direction
    // (the primary kill is the owner call succeeding)
  });
});