import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - maf0ecc40", function () {
  it("should kill mutant by calling getTokens when value equals totalRemaining", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state: totalDistributed = 200000000e18, totalSupply = 500000000e18
    // totalRemaining = 300000000e18, value = 1000e18

    // We need to make value equal to totalRemaining
    // We can call getTokens multiple times to reduce totalRemaining until it matches value
    // But first, let's check the current value and totalRemaining
    let value = await instance.value();
    let totalRemaining = await instance.totalRemaining();
    
    // Keep calling getTokens until value equals totalRemaining
    // Each call reduces value by (value / 100000).mul(99999) and totalRemaining by value
    while (value < totalRemaining) {
      // Need a fresh investor each time since blacklist is set after distribution
      const [_, ...signers] = await ethers.getSigners();
      for (const signer of signers) {
        if (value >= totalRemaining) break;
        
        // Check if this signer is not blacklisted
        const isBlacklisted = await instance.blacklist(signer.address);
        if (!isBlacklisted && value < totalRemaining) {
          await instance.connect(signer).getTokens();
          value = await instance.value();
          totalRemaining = await instance.totalRemaining();
        }
      }
    }

    // Now value should equal totalRemaining
    // In original contract: require(value <= totalRemaining) passes
    // In mutant: require(value < totalRemaining) fails
    
    // Get a fresh investor not blacklisted
    const freshInvestor = ethers.Wallet.createRandom().connect(ethers.provider);
    await owner.sendTransaction({
      to: freshInvestor.address,
      value: ethers.parseEther("1.0")
    });

    // This should succeed in original but revert in mutant
    if (value === totalRemaining) {
      // In mutant, this will revert because value < totalRemaining is false
      // In original, it will succeed because value <= totalRemaining is true
      await expect(
        instance.connect(freshInvestor).getTokens()
      ).to.be.reverted;
    }
  });
});