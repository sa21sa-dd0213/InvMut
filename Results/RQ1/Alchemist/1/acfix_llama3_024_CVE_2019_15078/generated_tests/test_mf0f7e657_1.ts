import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant kill test - onlyWhitelist modifier", function () {
  it("should revert when blacklisted user calls getTokens() but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the initial value (1000e18) and ensure totalRemaining is sufficient
    // First, give addr1 some tokens so it can be blacklisted via getTokens
    // But we need to bypass the blacklist check initially to set up the test
    // Actually, we can directly set blacklist via the mapping if possible, but it's not exposed
    // Alternative: call getTokens() from addr1 to get tokens and become blacklisted
    // Since getTokens() requires not being blacklisted, first call should succeed
    // Then the second call should revert in original (but pass in mutant)
    
    // First call: addr1 gets tokens and becomes blacklisted
    await instance.connect(addr1).getTokens();
    
    // Now addr1 is blacklisted. In the original contract, calling getTokens() again should revert
    // In the mutant, it will pass because require(blacklist[msg.sender] >= false) always passes
    
    // If mutant is killed, this second call should NOT revert (it should succeed)
    // But we want to detect the mutant by expecting a revert that doesn't happen
    // Actually, we need to assert the opposite: we expect revert, but mutant doesn't revert
    // Better approach: check that the call does NOT revert (which kills the mutant expectation)
    
    // Wait - the hypothesis says: test that expects revert should kill the mutant
    // because mutant allows the call. So we expect revert, and if it doesn't revert,
    // the test fails (which means mutant is detected as different from original)
    
    await expect(
      instance.connect(addr1).getTokens()
    ).to.be.reverted;
  });
});