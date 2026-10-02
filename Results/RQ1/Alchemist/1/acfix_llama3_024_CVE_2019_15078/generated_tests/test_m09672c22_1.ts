import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m09672c22 - getTokens blacklist bypass", function () {
  it("should revert on second getTokens call when user is blacklisted (original), but mutant allows multiple calls", async function () {
    const [owner, investor] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for XBORNID)
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ETH to allow getTokens() to work (value distribution)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // First call: investor gets tokens and gets blacklisted
    const tx1 = await instance.connect(investor).getTokens({ value: ethers.parseEther("1") });
    await tx1.wait();
    
    // Verify investor was blacklisted after first call
    const isBlacklisted = await instance.blacklist(investor.address);
    expect(isBlacklisted).to.be.true;
    
    // Second call: should revert due to onlyWhitelist modifier checking blacklist
    await expect(
      instance.connect(investor).getTokens({ value: ethers.parseEther("1") })
    ).to.be.reverted;
    
    // Note: In the mutant (if (false) instead of if (toGive > 0)), the blacklist
    // assignment never happens, so the second call would succeed instead of reverting.
    // This test will PASS on the original (revert expected) and FAIL on the mutant
    // (no revert, allowing double claiming), thus killing the mutant.
  });
});