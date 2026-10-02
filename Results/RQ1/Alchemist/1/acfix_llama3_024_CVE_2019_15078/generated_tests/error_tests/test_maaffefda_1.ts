import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - maaffefda", function () {
  it("should revert when calling getTokens with plenty of remaining tokens (mutant requires value >= totalRemaining)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially, totalRemaining = totalSupply - totalDistributed = 500000000e18 - 200000000e18 = 300000000e18
    // value = 1000e18
    // Since value (1000e18) < totalRemaining (300000000e18), the original require(value <= totalRemaining) would pass
    // The mutant require(value >= totalRemaining) would fail because 1000e18 < 300000000e18
    
    // Ensure addr1 is not blacklisted (onlyWhitelist modifier)
    // The getTokens function should succeed on original but revert on mutant
    await expect(
      instance.connect(addr1).getTokens()
    ).to.be.reverted;
  });
});