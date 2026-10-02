import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m9fc6cb15 - getTokens require(value == totalRemaining)", function () {
  it("should revert when value < totalRemaining, killing the mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state: totalDistributed = 200000000e18, totalRemaining = 300000000e18
    // value = 1000e18 initially
    // Call getTokens from addr1 (not blacklisted, distribution not finished)
    // This should succeed on original (value <= totalRemaining), but fail on mutant (value != totalRemaining)
    await expect(instance.connect(addr1).getTokens()).to.be.reverted;
  });
});