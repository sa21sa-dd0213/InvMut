import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant mc7023c7b test", function () {
  it("should kill mutant by transferring zero tokens from non-whitelisted address", async function () {
    const [owner, nonWhitelistedUser, recipient] = await ethers.getSigners();
    
    // Deploy DCF with a valid liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Transfer some tokens to non-whitelisted user for setup (not needed for zero transfer test)
    // but ensure the non-whitelisted user has some balance to avoid other issues
    await instance.transfer(nonWhitelistedUser.address, ethers.parseEther("1000"));
    
    // The hypothesis: original allows zero amount transfers from any address to bypass logic
    // Mutant changes || to && so zero amount from non-whitelisted from will NOT bypass
    // This should cause revert or unexpected behavior in mutant
    
    // Test: transfer zero tokens from non-whitelisted user to recipient
    // Original: should succeed (zero transfer bypass)
    // Mutant: should revert because it falls through to selling logic
    
    await expect(
      instance.connect(nonWhitelistedUser).transfer(recipient.address, 0)
    ).to.be.reverted;
  });
});