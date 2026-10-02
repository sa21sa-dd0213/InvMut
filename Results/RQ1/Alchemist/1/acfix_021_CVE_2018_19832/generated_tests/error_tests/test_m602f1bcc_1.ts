import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m602f1bcc test", function () {
  it("should detect mutant where totalDistributed >= totalSupply is replaced with == by testing distribution finish after exceeding total supply", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial state
    const initialTotalDistributed = await instance.totalDistributed();
    const initialTotalSupply = await instance.totalSupply();
    const initialTotalRemaining = await instance.totalRemaining();
    
    // Calculate value to trigger distribution that will exceed total supply
    // First, let's call getTokens to distribute tokens and reduce totalRemaining
    // We'll use addr1 to call getTokens
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });
    
    // Now totalDistributed has increased, totalRemaining has decreased
    // Let's calculate how much more we need to distribute to exceed totalSupply
    const totalDistributedAfterFirst = await instance.totalDistributed();
    const totalRemainingAfterFirst = await instance.totalRemaining();
    
    // The value variable gets halved each time due to value = (value / 100000).mul(99999)
    // We need to call getTokens multiple times until totalDistributed > totalSupply
    // Let's call it repeatedly with addr2 until we exceed total supply
    for (let i = 0; i < 20; i++) {
      try {
        await instance.connect(addr2).getTokens({ value: ethers.parseEther("1") });
      } catch (e) {
        // If it reverts, we've hit distribution finished or other condition
        break;
      }
    }
    
    // Check if distribution is finished
    const distributionFinished = await instance.distributionFinished();
    const finalTotalDistributed = await instance.totalDistributed();
    const finalTotalSupply = await instance.totalSupply();
    
    // In the original contract, when totalDistributed >= totalSupply, distributionFinished should be true
    // In the mutant, when totalDistributed == totalSupply only, distributionFinished becomes true
    // If totalDistributed > totalSupply, the mutant will NOT set distributionFinished = true
    // So we expect that if totalDistributed > totalSupply, distributionFinished should be false in mutant
    // but true in original
    
    if (finalTotalDistributed > finalTotalSupply) {
      // Original would have set distributionFinished = true
      // Mutant would have NOT set distributionFinished = true
      expect(distributionFinished).to.equal(true, "Distribution should be finished when totalDistributed >= totalSupply");
    } else if (finalTotalDistributed == finalTotalSupply) {
      // Both original and mutant would set distributionFinished = true
      expect(distributionFinished).to.equal(true, "Distribution should be finished when totalDistributed equals totalSupply");
    } else {
      // Still haven't exceeded supply, try with more aggressive approach
      // Reset and try to directly manipulate state through the distribution function
      // We need to call getTokens until we exceed
      for (let i = 0; i < 100; i++) {
        try {
          await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });
        } catch (e) {
          break;
        }
      }
      
      const finalCheckTotalDistributed = await instance.totalDistributed();
      const finalCheckTotalSupply = await instance.totalSupply();
      const finalCheckDistributionFinished = await instance.distributionFinished();
      
      // If we still can't exceed, the mutant might be killed by checking exact equality case
      // Let's verify that when totalDistributed == totalSupply, distribution finishes
      if (finalCheckTotalDistributed >= finalCheckTotalSupply) {
        expect(finalCheckDistributionFinished).to.equal(true, "Distribution should be finished when totalDistributed >= totalSupply");
      }
    }
  });
});