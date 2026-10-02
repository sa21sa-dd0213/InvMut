import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant mf77f67bb test", function () {
  it("should kill mutant by checking that toGive=0 does not blacklist the caller", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, set value to 0 so that toGive becomes 0
    // The getTokens() function sets toGive = value (which is 2500e18 initially)
    // We need to call getTokens() multiple times to reduce value to 0
    // The value reduction: value = (value / 100000) * 99999, which reduces it slowly
    // To speed up, we can directly manipulate via the onlyOwner NETM() or by exploiting the math
    // Instead, we can call getTokens() until value becomes 0
    // But for efficiency, let's call getTokens() from owner first (owner is not blacklisted initially)
    // Then from addr1 we test the blacklist behavior when value is 0

    // First, let's reduce value to 0 by calling getTokens() repeatedly
    // We'll use a loop but limit it to avoid excessive gas
    for (let i = 0; i < 100; i++) {
      try {
        await instance.connect(addr1).getTokens();
      } catch (e) {
        break;
      }
    }

    // Now check if value is 0 (or very small)
    const valueAfter = await instance.value();
    
    // If value is not 0 yet, we need to force it to 0
    // We can do this by setting totalRemaining to 0, then value will be set to totalRemaining (0)
    // Actually, the contract has a condition: if (value > totalRemaining) { value = totalRemaining; }
    // So we need totalRemaining to be 0
    // We can call finishDistribution() but that doesn't change totalRemaining
    // Instead, we can use the burn() function to reduce totalDistributed and totalSupply
    // But burn requires _value <= balances[msg.sender]
    // Let's just use the loop approach with a fresh account

    // Reset: deploy a new instance and use a different approach
    const instance2 = await Factory.deploy();
    await instance2.waitForDeployment();

    // We'll call NETM() to give owner all tokens, then call getTokens() from addr1
    // until value becomes 0, but we need to avoid blacklisting addr1
    // Actually, the blacklist only happens when toGive > 0 in original
    // So we can call from addr1 repeatedly; when value is 0, the blacklist won't happen
    
    // Call getTokens() from addr1 repeatedly until value becomes 0
    // Since each call reduces value, we'll keep calling until it's 0
    let currentValue = await instance2.value();
    while (currentValue > 0n) {
      try {
        await instance2.connect(addr1).getTokens();
        currentValue = await instance2.value();
      } catch (e) {
        break;
      }
    }

    // Now value should be 0, call getTokens() again - this should succeed in original (no blacklist)
    // But in mutant, it will blacklist addr1 and subsequent calls will revert
    
    // First call with value=0: should succeed (toGive=0, no blacklist in original)
    await instance2.connect(addr1).getTokens();
    
    // Second call should also succeed in original because addr1 was not blacklisted
    // In mutant, the first call blacklisted addr1, so this will revert
    await expect(instance2.connect(addr1).getTokens()).to.not.be.reverted;
    
    // If we reach here, the mutant is killed because the original allows the second call
    // but the mutant would have reverted
  });
});