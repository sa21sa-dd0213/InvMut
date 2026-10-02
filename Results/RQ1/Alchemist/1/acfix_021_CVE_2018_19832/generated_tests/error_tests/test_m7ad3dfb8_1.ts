import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m7ad3dfb8 - require value < totalRemaining", function () {
  it("should kill the mutant by calling getTokens when value equals totalRemaining", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state: totalRemaining = 250000000e18, value = 2500e18
    // We need to make totalRemaining exactly equal to value (2500e18)
    // First, distribute tokens to reduce totalRemaining to exactly 2500e18
    // Initial totalRemaining = 250000000e18
    // We need to distribute 250000000e18 - 2500e18 = 249997500e18 tokens
    // But we can only distribute value (2500e18) per call
    // We'll call getTokens multiple times from different addresses to reduce totalRemaining
    
    // First, let's get many addresses to call getTokens
    const signers = await ethers.getSigners();
    const addresses = signers.slice(1, 101); // Use 100 addresses
    
    // Call getTokens from each address to distribute tokens
    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      // Send ether to trigger getTokens via receive()
      await owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0.001")
      });
      
      // Call getTokens directly
      const tx = await instance.connect(addr).getTokens({ value: ethers.parseEther("0.001") });
      await tx.wait();
    }
    
    // After 100 calls, totalRemaining = 250000000e18 - (100 * 2500e18) = 250000000e18 - 250000e18 = 249750000e18
    // We need to continue until totalRemaining = 2500e18
    // Total calls needed: (250000000e18 - 2500e18) / 2500e18 = 99999 calls
    
    // Actually, let's use a simpler approach - directly manipulate via burn function
    // Burn tokens from owner to reduce totalDistributed and thus totalRemaining
    // totalRemaining = totalSupply - totalDistributed = 500000000e18 - 250000000e18 = 250000000e18
    // We need totalRemaining = 2500e18, so totalDistributed needs to be 500000000e18 - 2500e18 = 499997500e18
    // Current totalDistributed = 250000000e18, so we need to add 249997500e18 to totalDistributed
    // But we can't easily do that without many transactions
    
    // Alternative: Use the NETM function to set owner balance and then distribute
    // Actually, let's just check the condition directly
    
    // Get current totalRemaining
    let totalRemaining = await instance.totalRemaining();
    console.log("Initial totalRemaining:", totalRemaining.toString());
    
    // We need to make totalRemaining = value = 2500e18
    // Let's call getTokens until we reach that state
    let callCount = 0;
    while (totalRemaining > ethers.parseEther("2500")) {
      const addr = signers[callCount % 99 + 1]; // Cycle through addresses
      const tx = await instance.connect(addr).getTokens({ value: ethers.parseEther("0.001") });
      await tx.wait();
      totalRemaining = await instance.totalRemaining();
      callCount++;
      if (callCount > 100000) break; // Safety limit
    }
    
    console.log("Final totalRemaining:", totalRemaining.toString());
    console.log("Current value:", (await instance.value()).toString());
    
    // Now totalRemaining should be exactly equal to value (2500e18)
    // Try calling getTokens from a fresh address
    const freshAddress = signers[101];
    
    // This should succeed on original (<=) but fail on mutant (<)
    await expect(
      instance.connect(freshAddress).getTokens({ value: ethers.parseEther("0.001") })
    ).to.be.reverted; // On mutant, this will revert because value < totalRemaining is false when equal
    
    // Verify the mutant is killed (transaction reverted)
    // On original contract, this would succeed and distribute the remaining tokens
  });
});