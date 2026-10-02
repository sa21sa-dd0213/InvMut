import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant test - m5c276a01", function () {
  it("should kill mutant by verifying blacklist behavior after getTokens", async function () {
    const [owner, investor] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Ensure distribution is not finished
    expect(await instance.distributionFinished()).to.be.false;
    
    // Send ether to trigger getTokens() via receive() or call getTokens() directly
    // The contract requires value to be <= totalRemaining (250000000e18 initially)
    // We'll send a small amount of ether to trigger the function
    await investor.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("0.1")
    });
    
    // After first call, investor should be blacklisted in original
    // In mutant, blacklist will NOT be set because toGive < 0 is always false for uint256
    
    // Now try to call getTokens again from same investor - should revert in original (blacklisted)
    // In mutant, it should succeed (not blacklisted)
    await expect(
      instance.connect(investor).getTokens()
    ).to.be.reverted; // This will fail on mutant (no revert) but pass on original
  });
});