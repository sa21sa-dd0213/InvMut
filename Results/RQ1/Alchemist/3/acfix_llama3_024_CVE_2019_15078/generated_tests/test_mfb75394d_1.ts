import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mfb75394d test", function () {
  it("should revert when trying to distribute more tokens than totalSupply due to incorrect totalRemaining calculation", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially totalDistributed = 200000000e18, totalSupply = 500000000e18
    // Original totalRemaining = 300000000e18
    // Mutant totalRemaining = 700000000e18 (incorrectly larger)
    
    // Send ETH to trigger getTokens() which distributes value = 1000e18 tokens per call
    // We will send multiple transactions to distribute tokens until totalDistributed exceeds totalSupply
    // In the original, totalRemaining would limit distribution
    // In the mutant, totalRemaining is inflated, allowing distribution beyond totalSupply
    
    // First distribution
    await investor.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Check initial state after first distribution
    let totalDistributed = await instance.totalDistributed();
    let totalSupply = await instance.totalSupply();
    let totalRemaining = await instance.totalRemaining();
    
    // In mutant, totalRemaining = totalSupply + totalDistributed (incorrect)
    // We need to distribute enough to exceed totalSupply
    // value decreases each time by factor of 99999/100000
    
    // Keep distributing until totalDistributed >= totalSupply
    let iterations = 0;
    while (totalDistributed < totalSupply && iterations < 10000) {
      await investor.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      });
      totalDistributed = await instance.totalDistributed();
      totalSupply = await instance.totalSupply();
      iterations++;
    }
    
    // Now totalDistributed should be >= totalSupply
    // In original, distributionFinished would be true and further getTokens() would revert
    // In mutant, totalRemaining is inflated so getTokens() may still succeed
    
    // Try one more distribution - should revert in original, might succeed in mutant
    const tx = investor.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // If the mutant is alive, this transaction will succeed (incorrect behavior)
    // If the original is used, this will revert
    await expect(tx).to.be.reverted;
  });
});