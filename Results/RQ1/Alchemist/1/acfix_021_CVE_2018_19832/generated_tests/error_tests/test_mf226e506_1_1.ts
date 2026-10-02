import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant mf226e506 - onlyWhitelist removal", function () {
  it("should revert when blacklisted address calls getTokens() on original, but not on mutant", async function () {
    const [owner, investor] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First call: investor gets tokens and becomes blacklisted
    await instance.connect(investor).getTokens({ value: ethers.parseEther("0") });
    
    // Verify investor is now blacklisted
    expect(await instance.blacklist(investor.address)).to.be.true;
    
    // Second call: on original contract this should revert due to onlyWhitelist
    // On mutant (where modifier is removed) this will succeed instead of reverting
    await expect(
      instance.connect(investor).getTokens({ value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});