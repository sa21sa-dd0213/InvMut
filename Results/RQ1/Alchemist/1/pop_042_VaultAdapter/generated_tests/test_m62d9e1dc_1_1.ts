import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m62d9e1dc test", function () {
  it("should detect mutant that changes multiplication to exponentiation in _applySlopes", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments as per code)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock vault to test with
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    
    const vaultAddress = await mockVault.getAddress();
    const assetAddress = addr1.address; // Use any address as asset
    
    // Initialize the vault adapter
    await vaultAdapter.initialize(owner.address);
    
    // Set slopes for the asset
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.1");
    const slope1 = ethers.parseEther("0.2");
    await vaultAdapter.setSlopes(assetAddress, { kink, slope0, slope1 });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("0.01"); // 1% rate
    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);
    
    // First call to rate() to initialize utilization data with current timestamp
    await vaultAdapter.rate(vaultAddress, assetAddress);
    
    // Increase time by a significant amount (e.g., 100 seconds) to make _elapsed > 1
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);
    
    // Now call rate() again - this will use the elapsed time
    // The mutant will compute (base ** 100) instead of (base * 100)
    // This will produce astronomically different results
    const rateResult = await vaultAdapter.rate(vaultAddress, assetAddress);
    
    // Calculate expected result for original (multiplication) vs mutant (exponentiation)
    // For the original: multiplier * (1e27 + (1e27 * excess / (1e27 - kink)) * 100 * rate / 1e27) / 1e27
    // For the mutant: multiplier * (1e27 + (1e27 * excess / (1e27 - kink)) ** 100 * rate / 1e27) / 1e27
    
    // The mutant result would be astronomically larger (> 10^200)
    // The original result would be reasonable (< 10^27)
    
    // Assert that the result is within reasonable bounds (original behavior)
    // The mutant would produce a value that overflows or is unreasonably large
    expect(rateResult).to.be.lessThan(ethers.parseEther("100")); // Reasonable max interest rate
  });
});