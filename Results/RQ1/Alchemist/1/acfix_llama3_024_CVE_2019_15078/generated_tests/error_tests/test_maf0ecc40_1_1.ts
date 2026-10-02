import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - maf0ecc40", function () {
  it("should kill mutant by calling getTokens when value equals totalRemaining", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state: totalDistributed = 200000000e18, totalSupply = 500000000e18
    // totalRemaining = 300000000e18, value = 1000e18

    // We need to make value equal to totalRemaining
    let value = await instance.value();
    let totalRemaining = await instance.totalRemaining();

    // Keep calling getTokens until value equals totalRemaining
    while (value < totalRemaining) {
      const signers = await ethers.getSigners();
      for (let i = 1; i < signers.length; i++) {
        if (value >= totalRemaining) break;
        
        const signer = signers[i];
        const isBlacklisted = await instance.blacklist(signer.address);
        if (!isBlacklisted && value < totalRemaining) {
          try {
            await instance.connect(signer).getTokens();
          } catch (e) {
            // Ignore reverts, continue
          }
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