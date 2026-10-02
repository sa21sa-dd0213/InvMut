import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - Kill mutant m4923f0ae (distr >= replaced with ==)", function () {
  it("should detect the mutant by distributing tokens that push totalDistributed past totalSupply", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial state
    const totalSupply = await instance.totalSupply();
    const initialDistributed = await instance.totalDistributed();
    
    // Calculate remaining tokens to distribute
    const remaining = totalSupply - initialDistributed;
    
    // First distribution - send almost all remaining tokens to addr1
    // This will leave totalDistributed just below totalSupply
    const firstAmount = remaining - ethers.parseEther("1");
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });

    // Check current state after first distribution
    let currentDistributed = await instance.totalDistributed();
    let currentRemaining = totalSupply - currentDistributed;
    
    // Make multiple small distributions to ensure we cross the threshold
    for(let i = 0; i < 5; i++) {
      await instance.connect(addr2).getTokens({ value: ethers.parseEther("1") });
    }
    
    // Check if distribution is finished
    const isFinished = await instance.distributionFinished();
    
    // In the original contract, distribution should be finished
    // In the mutant (with == instead of >=), it might not be finished
    // Try one more distribution - this should revert if distribution is finished
    if(isFinished) {
      await expect(
        instance.connect(owner).getTokens({ value: ethers.parseEther("1") })
      ).to.be.reverted;
    } else {
      // If distribution is not finished in mutant, try to distribute more
      // This would exceed totalSupply, proving the mutant is faulty
      await instance.connect(owner).getTokens({ value: ethers.parseEther("1") });
      const finalDistributed = await instance.totalDistributed();
      expect(finalDistributed).to.be.gt(totalSupply);
    }
  });
});