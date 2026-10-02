import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m7ad3dfb8 - require value < totalRemaining", function () {
  it("should kill the mutant by calling getTokens when value equals totalRemaining", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get current totalRemaining
    let totalRemaining = await instance.totalRemaining();
    console.log("Initial totalRemaining:", totalRemaining.toString());
    
    // We need to make totalRemaining = value = 2500e18
    // Current value = 2500e18, totalRemaining = 250000000e18
    // We need to distribute (250000000e18 - 2500e18) = 249997500e18 tokens
    // Each getTokens call distributes value (2500e18) tokens
    
    const signers = await ethers.getSigners();
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

    // This should fail on mutant because value == totalRemaining, so require(value < totalRemaining) fails
    await expect(
      instance.connect(freshAddress).getTokens({ value: ethers.parseEther("0.001") })
    ).to.be.reverted;
  });
});