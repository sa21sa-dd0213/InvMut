import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant kill test - m954ca568", function () {
  it("should kill mutant by distributing more tokens than actual totalSupply due to inflated totalRemaining", async function () {
    const [owner, investor1, investor2, investor3] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed as per the contract)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get initial values
    const totalSupply = await instance.totalSupply();
    const totalDistributed = await instance.totalDistributed();
    const totalRemaining = await instance.totalRemaining();
    
    console.log("Initial totalSupply:", ethers.formatEther(totalSupply));
    console.log("Initial totalDistributed:", ethers.formatEther(totalDistributed));
    console.log("Initial totalRemaining:", ethers.formatEther(totalRemaining));
    
    // In original: totalRemaining = totalSupply - totalDistributed = 250M
    // In mutant: totalRemaining = totalSupply + totalDistributed = 750M (inflated)
    
    // The value variable determines how many tokens are given per getTokens() call
    // Initially value = 2500e18
    
    // First distribution from investor1 - should succeed in both
    await instance.connect(investor1).getTokens({ value: ethers.parseEther("0.001") });
    let distAfterFirst = await instance.totalDistributed();
    console.log("After investor1 - totalDistributed:", ethers.formatEther(distAfterFirst));
    
    // Second distribution from investor2
    await instance.connect(investor2).getTokens({ value: ethers.parseEther("0.001") });
    let distAfterSecond = await instance.totalDistributed();
    console.log("After investor2 - totalDistributed:", ethers.formatEther(distAfterSecond));
    
    // Now calculate how many more calls we can make
    // In original: totalRemaining starts at 250M and decreases with each distribution
    // In mutant: totalRemaining starts at 750M and decreases with each distribution
    
    // We'll try to distribute more than the actual supply (500M)
    // In original, this should revert because totalRemaining will reach 0
    // In mutant, this might succeed because totalRemaining starts inflated
    
    let currentDist = distAfterSecond;
    let investorIndex = 3;
    let canDistributeMore = true;
    let distributionsCount = 0;
    const maxDistributions = 1000; // Safety limit
    
    while (canDistributeMore && distributionsCount < maxDistributions) {
      const signer = ethers.getSigners();
      const currentInvestor = (await signer)[investorIndex % 10]; // Cycle through first 10 signers
      
      try {
        // Try to call getTokens
        const tx = await instance.connect(currentInvestor).getTokens({ value: ethers.parseEther("0.001") });
        await tx.wait();
        
        currentDist = await instance.totalDistributed();
        distributionsCount++;
        
        // Check if we've exceeded totalSupply (which should be impossible in original)
        if (currentDist > totalSupply) {
          console.log("SUCCESS - Distributed more than totalSupply! Current distributed:", ethers.formatEther(currentDist));
          console.log("Total supply:", ethers.formatEther(totalSupply));
          console.log("Excess:", ethers.formatEther(currentDist - totalSupply));
          
          // If we get here, the mutant is detected (killed)
          expect(currentDist).to.be.gt(totalSupply);
          break;
        }
        
        investorIndex++;
      } catch (error: any) {
        // If transaction reverts, check if it's because totalRemaining is exhausted
        console.log(`Reverted at distribution ${distributionsCount}, current distributed: ${ethers.formatEther(currentDist)}`);
        console.log("Error:", error.message?.substring(0, 200));
        canDistributeMore = false;
        break;
      }
    }
    
    // Final assertion: if we distributed more than totalSupply, the mutant is killed
    const finalDistributed = await instance.totalDistributed();
    console.log("Final totalDistributed:", ethers.formatEther(finalDistributed));
    console.log("Total supply:", ethers.formatEther(totalSupply));
    
    // The test passes (kills mutant) if we managed to distribute more than totalSupply
    expect(finalDistributed).to.be.gt(totalSupply);
  });
});