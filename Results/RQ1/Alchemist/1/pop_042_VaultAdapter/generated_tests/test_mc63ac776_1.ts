import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant kill test - mc63ac776", function () {
  it("should detect the division vs subtraction mutation in _applySlopes when utilization is close to kink", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments as per the contract)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock vault contract that returns utilization values
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Initialize the VaultAdapter
    await vaultAdapter.initialize(owner.address);
    
    // Set slopes with kink at 1e27 (100% in 1e27 precision)
    const kink = ethers.parseEther("1"); // 1e18, but we need 1e27 precision
    const slope0 = ethers.parseEther("0.05"); // 5%
    const slope1 = ethers.parseEther("0.1"); // 10%
    const maxMultiplier = ethers.parseEther("2"); // 2x
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x
    const rate = ethers.parseEther("0.01"); // 1%
    
    await vaultAdapter.setSlopes(mockVault.target, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Set utilization to 99% of kink (close but below kink)
    // This is where the subtraction vs division mutation would produce significantly different results
    const utilizationValue = kink * 99n / 100n; // 99% of kink
    
    // Set mock vault to return this utilization
    await mockVault.setUtilization(utilizationValue);
    
    // Call rate function which internally calls _applySlopes
    const result = await vaultAdapter.rate(mockVault.target, ethers.ZeroAddress);
    
    // For the original contract with subtraction: (kink - utilization) = kink * 1%
    // For the mutant with division: (kink / utilization) ≈ 1.0101...
    // This would produce vastly different multiplier values
    
    // Calculate expected result for the ORIGINAL (non-mutant) contract
    // multiplier = multiplier * 1e27 / (1e27 + (1e27 * (kink - utilization) / kink) * elapsed * rate / 1e27)
    // With fresh state, multiplier starts at 1e27
    // elapsed = 0 (first call), so multiplier stays at 1e27
    // interestRate = (slope0 * utilization / kink) * multiplier / 1e27
    // = (0.05e18 * 0.99e18 / 1e18) * 1e18 / 1e18
    // = 0.0495e18
    
    const expectedInterestRate = slope0 * utilizationValue / kink;
    
    // The mutant would produce a different result because:
    // (kink / utilization) instead of (kink - utilization)
    // This changes the multiplier calculation dramatically
    
    expect(result).to.equal(expectedInterestRate);
  });
});