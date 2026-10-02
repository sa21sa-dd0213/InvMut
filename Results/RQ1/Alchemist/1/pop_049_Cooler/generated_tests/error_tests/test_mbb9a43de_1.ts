import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant detection - interestFor", function () {
  it("should kill mutant mbb9a43de by verifying correct interest calculation", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the Cooler contract (requires constructor arguments - none in this case)
    const CoolerFactory = await ethers.getContractFactory("Cooler");
    const cooler = await CoolerFactory.deploy();
    await cooler.waitForDeployment();

    // Test the interestFor function with specific values that expose the mutant
    // amount_ = 1000, rate_ = 500000000000000000 (0.5 * 1e18), duration_ = 365 days
    const amount = ethers.parseEther("1000");
    const rate = ethers.parseEther("0.5"); // 0.5 * 1e18
    const duration = 365 * 24 * 60 * 60; // 365 days in seconds
    
    // Calculate expected result: (amount * rate * duration / 365 days) / 1e18
    // Simplified: (amount * (rate * duration / 365 days)) / 1e18
    const expectedInterest = (amount * rate * BigInt(duration)) / (BigInt(365 * 24 * 60 * 60) * ethers.parseEther("1"));
    
    // Get actual result from contract
    const actualInterest = await cooler.interestFor(amount, rate, duration);
    
    // Assert that the actual result matches the expected result
    // The mutant would compute amount ** rate instead of amount * rate, producing a completely different result
    expect(actualInterest).to.equal(expectedInterest);
    
    // Additional edge case: test with values where exponentiation would give very different results
    const smallAmount = ethers.parseEther("2");
    const smallRate = ethers.parseEther("3");
    const smallDuration = 1; // 1 second
    
    const expectedSmallInterest = (smallAmount * smallRate * BigInt(smallDuration)) / (BigInt(365 * 24 * 60 * 60) * ethers.parseEther("1"));
    const actualSmallInterest = await cooler.interestFor(smallAmount, smallRate, smallDuration);
    
    // For amount=2, rate=3: original = (2*3*1)/(365*86400*1e18) = 6/(~3.15e22)
    // Mutant = (2**3*1)/(365*86400*1e18) = 8/(~3.15e22)
    // These are different values, so assertion will fail on mutant
    expect(actualSmallInterest).to.equal(expectedSmallInterest);
  });
});