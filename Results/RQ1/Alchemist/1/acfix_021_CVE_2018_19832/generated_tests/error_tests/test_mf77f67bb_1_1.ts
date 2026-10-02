import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant mf77f67bb test", function () {
  it("should kill mutant by checking that toGive=0 does not blacklist the caller", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call getTokens() from addr1 repeatedly until value becomes 0
    let currentValue = await instance.value();
    while (currentValue > 0n) {
      try {
        await instance.connect(addr1).getTokens();
        currentValue = await instance.value();
      } catch (e) {
        break;
      }
    }

    // Now value should be 0, call getTokens() again - this should succeed in original (no blacklist)
    // But in mutant, it will blacklist addr1 and subsequent calls will revert

    // First call with value=0: should succeed (toGive=0, no blacklist in original)
    await instance.connect(addr1).getTokens();

    // Second call should also succeed in original because addr1 was not blacklisted
    // In mutant, the first call blacklisted addr1, so this will revert
    await expect(instance.connect(addr1).getTokens()).to.not.be.reverted;

    // If we reach here, the mutant is killed because the original allows the second call
    // but the mutant would have reverted
  });
});