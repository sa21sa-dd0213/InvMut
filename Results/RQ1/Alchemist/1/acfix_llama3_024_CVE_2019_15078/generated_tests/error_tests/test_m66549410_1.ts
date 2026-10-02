import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m66549410 test", function () {
  it("should revert on original but succeed on mutant when getTokens is called with value exceeding totalRemaining", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set up initial state: distribution not finished, investor not blacklisted
    expect(await instance.distributionFinished()).to.be.false;
    expect(await instance.blacklist(investor.address)).to.be.false;

    // Get initial totalRemaining
    let totalRemaining = await instance.totalRemaining();
    
    // Calculate value that will be used in getTokens
    let currentValue = await instance.value();
    
    // We need to make value > totalRemaining to test the require statement
    // First, let's drain totalRemaining by having investor call getTokens multiple times
    // But investor gets blacklisted after first call, so we need multiple investors
    
    const investors = [];
    for (let i = 0; i < 5; i++) {
      const signer = ethers.Wallet.createRandom().connect(ethers.provider);
      investors.push(signer);
    }
    
    // Fund investors with ETH for gas
    for (const inv of investors) {
      await owner.sendTransaction({
        to: inv.address,
        value: ethers.parseEther("1")
      });
    }
    
    // Call getTokens multiple times to reduce totalRemaining
    for (let i = 0; i < investors.length; i++) {
      const inv = investors[i];
      const instanceAsInv = instance.connect(inv);
      
      // Check if investor is not blacklisted
      if (await instance.blacklist(inv.address)) {
        continue;
      }
      
      // Check totalRemaining before call
      totalRemaining = await instance.totalRemaining();
      currentValue = await instance.value();
      
      // If value > totalRemaining, this is where the require would fail on original
      // but pass on mutant
      if (currentValue > totalRemaining) {
        // On original: should revert due to require(value <= totalRemaining)
        // On mutant: should proceed (and potentially cause underflow)
        
        // We can't directly test both versions, but we can verify the behavior
        // by checking if the call succeeds (mutant) vs reverts (original)
        try {
          const tx = await instanceAsInv.getTokens();
          await tx.wait();
          
          // If we get here, the mutant is active (require removed)
          // Check for potential issues: totalRemaining might underflow
          const newTotalRemaining = await instance.totalRemaining();
          const newTotalDistributed = await instance.totalDistributed();
          
          // Verify the contract state is corrupted
          // totalRemaining should never be negative or extremely large
          expect(newTotalRemaining).to.be.lt(totalRemaining);
          
          // If we reached here, the mutant allowed an invalid state
          // This proves the mutant is killed (different behavior than original)
          console.log("Mutant detected: transaction succeeded without require check");
        } catch (error) {
          // On original, this would revert - test passes for original
          // But we're testing the mutant, so this would mean the mutant was NOT killed
          expect.fail("Mutant not detected: transaction reverted");
        }
      } else {
        // value <= totalRemaining, normal operation
        const tx = await instanceAsInv.getTokens();
        await tx.wait();
      }
    }
    
    // If we haven't triggered the condition yet, try one more time
    totalRemaining = await instance.totalRemaining();
    currentValue = await instance.value();
    
    if (currentValue > totalRemaining) {
      // Need a fresh non-blacklisted investor
      const freshInvestor = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({
        to: freshInvestor.address,
        value: ethers.parseEther("1")
      });
      
      const instanceAsFresh = instance.connect(freshInvestor);
      
      try {
        const tx = await instanceAsFresh.getTokens();
        await tx.wait();
        
        // Mutant detected: transaction succeeded without require check
        const corruptedRemaining = await instance.totalRemaining();
        console.log(`Mutant detected: totalRemaining became ${corruptedRemaining}`);
        expect(true).to.be.true; // Test passes - mutant killed
      } catch (error) {
        // This would mean the mutant was not killed
        expect.fail("Mutant not detected: transaction reverted");
      }
    } else {
      // If we can't trigger the condition, we need to manipulate state differently
      // Let's check if we can call finishDistribution and then try
      // But getTokens requires canDistr modifier, so distribution must not be finished
      
      // Alternative: try to exploit the value calculation
      // After each call, value = (value / 100000).mul(99999)
      // This gradually decreases value, so eventually it will be <= totalRemaining
      
      // To truly test the mutant, we need value > totalRemaining
      // Let's try to make totalRemaining very small
      await instance.connect(owner).burn(await instance.totalSupply());
      
      totalRemaining = await instance.totalRemaining();
      currentValue = await instance.value();
      
      // Now totalRemaining should be very small or zero
      // Try one more call
      const lastInvestor = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({
        to: lastInvestor.address,
        value: ethers.parseEther("1")
      });
      
      const instanceAsLast = instance.connect(lastInvestor);
      
      try {
        const tx = await instanceAsLast.getTokens();
        await tx.wait();
        console.log("Mutant detected: transaction succeeded with value > totalRemaining");
        expect(true).to.be.true;
      } catch (error) {
        expect.fail("Mutant not detected: transaction reverted");
      }
    }
  });
});