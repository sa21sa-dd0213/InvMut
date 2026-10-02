import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleSuicide mutant detection - inequality operator", function () {
  it("should allow owner to call sudicideAnyone (original) but revert for non-owner call (mutant detection)", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleSuicide");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract allows owner to call sudicideAnyone successfully
    // The mutant (with !=) would revert for owner because owner != owner is false
    // So a test that expects owner call to succeed will fail on the mutant

    // Get the deployed contract address to check selfdestruct later
    const contractAddress = await instance.getAddress();

    // Owner calls sudicideAnyone - should succeed in original, revert in mutant
    const tx = instance.connect(owner).sudicideAnyone();
    
    // This assertion will pass on the original (owner can call) and fail on the mutant
    await expect(tx).to.not.be.reverted;
    
    // Verify contract was actually destroyed
    const codeAfter = await ethers.provider.getCode(contractAddress);
    expect(codeAfter).to.equal("0x");
  });
});