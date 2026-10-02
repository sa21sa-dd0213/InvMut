import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mbf886be6 test", function () {
  it("should detect mutant that disables distribution finish check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, distribute tokens until totalDistributed reaches totalSupply
    // The initial state: totalDistributed = 200000000e18, totalSupply = 500000000e18
    // We need to distribute 300000000e18 more tokens
    // Each getTokens() call distributes value = 1000e18 tokens initially
    // Calculate how many calls needed: 300000000e18 / 1000e18 = 300000 calls
    // But after each call, value decreases by factor of 99999/100000
    // To simplify, we'll call getTokens() repeatedly until totalDistributed reaches totalSupply

    // Make multiple calls to distribute tokens
    let totalDistributed = ethers.parseEther("200000000");
    const totalSupply = ethers.parseEther("500000000");

    while (totalDistributed < totalSupply) {
      // Check if we can still call getTokens (distributionFinished should be false)
      const distributionFinished = await instance.distributionFinished();
      if (distributionFinished) break;

      // Call getTokens from addr1 (not blacklisted)
      await instance.connect(addr1).getTokens();

      // Update totalDistributed
      totalDistributed = await instance.totalDistributed();
    }

    // After distribution is complete, distributionFinished should be true
    const isFinished = await instance.distributionFinished();

    // In the original contract, distributionFinished should be true
    // In the mutant, it will still be false because the condition was replaced with false
    expect(isFinished).to.equal(true);

    // Additionally, try to call getTokens again - should revert in original
    // but succeed in mutant (which would be incorrect behavior)
    await expect(
      instance.connect(addr1).getTokens()
    ).to.be.reverted;
  });
});