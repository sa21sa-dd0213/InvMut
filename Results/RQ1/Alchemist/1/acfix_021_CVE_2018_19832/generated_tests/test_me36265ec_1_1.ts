import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant me36265ec test", function () {
  it("should revert when value exceeds totalRemaining in original, but succeed in mutant", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, let investor get tokens to reduce totalRemaining
    // The initial totalRemaining is 250000000e18 (totalSupply - totalDistributed)
    // Initial value is 2500e18
    
    // Get initial state
    const initialValue = await instance.value();
    const initialTotalRemaining = await instance.totalRemaining();
    
    // Call getTokens() multiple times to deplete totalRemaining below value
    // Each call reduces totalRemaining by value and then value decreases slightly
    let currentValue = initialValue;
    let currentTotalRemaining = initialTotalRemaining;
    
    // Keep calling getTokens until value would exceed totalRemaining
    while (currentValue <= currentTotalRemaining) {
      // Send ether to trigger getTokens via receive
      await investor.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      });
      
      // Update state
      currentValue = await instance.value();
      currentTotalRemaining = await instance.totalRemaining();
    }
    
    // Now currentValue > currentTotalRemaining
    // In original contract, this should revert
    // In mutant, it should not revert (which would be incorrect behavior)
    
    // Try one more call - should revert in original but not in mutant
    try {
      await investor.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      });
      
      // If we reach here, the transaction succeeded (mutant behavior)
      // This means the require was removed, so the mutant is killed
      const finalTotalRemaining = await instance.totalRemaining();
      const finalValue = await instance.value();
      
      // Verify the mutant caused incorrect state
      expect(finalValue).to.be.gt(finalTotalRemaining);
      
    } catch (error: any) {
      // If it reverts, the require is still present (original behavior)
      // This means the test should fail as we couldn't kill the mutant
      expect.fail("Mutant not detected - require statement still present");
    }
  });
});