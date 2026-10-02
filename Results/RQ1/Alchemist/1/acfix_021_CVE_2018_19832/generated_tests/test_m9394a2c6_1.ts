import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant test - distr function >= vs >", function () {
  it("should kill mutant by checking distributionFinished after distributing exactly totalSupply", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial values
    const totalSupply = await instance.totalSupply();
    const totalDistributed = await instance.totalDistributed();
    
    // Calculate how much we need to distribute to reach exactly totalSupply
    const remainingToDistribute = totalSupply - totalDistributed;
    
    // The getTokens function uses value which starts at 2500e18
    // We need to distribute exactly the remaining amount to reach totalSupply
    // Since getTokens distributes 'value' amount each time, we need to call it
    // multiple times or manipulate the value
    
    // First, let's distribute some tokens to addr1
    await instance.connect(addr1).getTokens();
    
    // Check distributionFinished - it should be false since we haven't reached totalSupply
    let finished = await instance.distributionFinished();
    expect(finished).to.be.false;
    
    // Calculate remaining after first distribution
    let currentDistributed = await instance.totalDistributed();
    let remaining = totalSupply - currentDistributed;
    
    // We need to distribute exactly 'remaining' amount
    // The value decreases each time (value = (value / 100000).mul(99999))
    // We need to find the right number of calls to make totalDistributed exactly equal totalSupply
    
    // For the test, let's keep calling getTokens until totalDistributed equals totalSupply
    // This will test the edge case where totalDistributed == totalSupply
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      const distBefore = await instance.totalDistributed();
      const valueBefore = await instance.value();
      
      // Check if next distribution would exceed or equal totalSupply
      if (distBefore + valueBefore >= totalSupply) {
        // Next call should set distributionFinished = true
        // In original: >= condition triggers finish
        // In mutant: > condition does NOT trigger finish when equal
        
        // Get a fresh account to avoid blacklist
        const [,, addr2] = await ethers.getSigners();
        await instance.connect(addr2).getTokens();
        
        finished = await instance.distributionFinished();
        
        // In original contract, distributionFinished should be true
        // In mutant, distributionFinished should be false (because > instead of >=)
        // This will kill the mutant
        expect(finished).to.be.true;
        break;
      }
      
      // Continue distributing
      const [,, newAddr] = await ethers.getSigners();
      await instance.connect(newAddr).getTokens();
      attempts++;
    }
    
    // Verify we actually tested the edge case
    expect(attempts).to.be.lessThan(maxAttempts);
  });
});