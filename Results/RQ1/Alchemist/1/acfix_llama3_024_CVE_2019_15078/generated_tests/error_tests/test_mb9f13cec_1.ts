import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mb9f13cec - getTokens blacklist when toGive=0", function () {
  it("should allow a second call to getTokens when toGive is zero (value equals totalRemaining)", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set initial conditions: totalRemaining = 1000e18, value = 1000e18
    // Call getTokens from investor: toGive = value = 1000e18, which equals totalRemaining
    // After first call, totalRemaining becomes 0 and value becomes (1000e18 / 100000) * 99999 = 999.99e18
    await instance.connect(investor).getTokens();

    // Now value = 999.99e18, totalRemaining = 0
    // Call getTokens again from the same investor - toGive will be set to totalRemaining (0)
    // In original contract, blacklist is not set because toGive > 0 is false
    // In mutant, blacklist IS set because toGive >= 0 is true, causing revert
    await expect(instance.connect(investor).getTokens()).to.not.be.reverted;
  });
});