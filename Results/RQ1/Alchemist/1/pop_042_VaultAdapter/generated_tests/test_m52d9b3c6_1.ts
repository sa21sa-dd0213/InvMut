import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m52d9b3c6", function () {
  it("should kill the mutant by verifying interest rate calculation when utilization is below kink", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy VaultAdapter (constructor has no arguments - it only calls _disableInitializers())
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock vault contract to test with
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy a mock access control contract
    const MockAccessControl = await ethers.getContractFactory("MockAccessControl");
    const mockAccessControl = await MockAccessControl.deploy();
    await mockAccessControl.waitForDeployment();
    
    // Initialize VaultAdapter
    await vaultAdapter.initialize(await mockAccessControl.getAddress());
    
    // Set up slopes with kink at 0.5e27 (50% utilization)
    const kink = ethers.parseEther("0.5");
    const slope0 = ethers.parseEther("0.1"); // 10% base rate
    const slope1 = ethers.parseEther("0.2"); // 20% slope above kink
    await vaultAdapter.setSlopes(await mockVault.getAddress(), {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("0.1");
    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Set up mock vault to return 30% utilization (below kink of 50%)
    const utilizationBelowKink = ethers.parseEther("0.3");
    await mockVault.setUtilization(utilizationBelowKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1"));
    
    // Call rate() which will trigger _applySlopes with utilization below kink
    // The original formula: multiplier = multiplier * 1e27 / (1e27 + (1e27 * (kink - utilization) / kink) * elapsed * rate / 1e27)
    // The mutant formula:  multiplier = multiplier * 1e27 / (1e27 + (1e27 * (kink - utilization) / kink) * elapsed * rate + 1e27)
    // The mutant produces a MUCH larger denominator, resulting in a much smaller multiplier
    
    const initialMultiplier = ethers.parseEther("1");
    // We need to call rate twice to see the effect (first call initializes)
    await vaultAdapter.rate(await mockVault.getAddress(), ethers.ZeroAddress);
    
    // Get the actual rate after multiplier update
    const result = await vaultAdapter.rate(await mockVault.getAddress(), ethers.ZeroAddress);
    
    // Expected multiplier with original formula (after 1 second with rate=0.1):
    // elapsed = 1 (assuming 1 second passed)
    // kink - utilization = 0.5 - 0.3 = 0.2
    // (1e27 * 0.2 / 0.5) = 0.4e27
    // 0.4e27 * 1 * 0.1 / 1e27 = 0.04e27
    // denominator = 1e27 + 0.04e27 = 1.04e27
    // multiplier = 1e27 * 1e27 / 1.04e27 ≈ 0.9615e27
    
    // Expected interest rate = (slope0 * utilization / kink) * multiplier / 1e27
    // = (0.1 * 0.3 / 0.5) * 0.9615 / 1e27
    // = 0.06 * 0.9615 ≈ 0.0577e27
    
    // With mutant: denominator = 1e27 + 0.4e27 * 1 * 0.1 + 1e27 = 1e27 + 0.04e27 + 1e27 = 2.04e27
    // multiplier = 1e27 * 1e27 / 2.04e27 ≈ 0.4902e27
    // interest rate = 0.06 * 0.4902 ≈ 0.0294e27
    
    // The mutant produces a significantly different result (~0.0294 vs ~0.0577)
    // We can detect this by checking the result is NOT equal to the mutant's expected value
    
    // The original expected value (approximate)
    const expectedOriginalRate = ethers.parseEther("0.0577");
    
    // The mutant would produce approximately:
    const expectedMutantRate = ethers.parseEther("0.0294");
    
    // Assert that the result matches the original formula, not the mutant
    // The result should be closer to expectedOriginalRate than expectedMutantRate
    const diffFromOriginal = result > expectedOriginalRate 
      ? result - expectedOriginalRate 
      : expectedOriginalRate - result;
    const diffFromMutant = result > expectedMutantRate 
      ? result - expectedMutantRate 
      : expectedMutantRate - result;
    
    expect(diffFromOriginal).to.be.lessThan(diffFromMutant);
  });
});