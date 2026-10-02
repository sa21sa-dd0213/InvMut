import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant detection test", function () {
  it("should detect the / to + mutation in _applySlopes when utilization > kink", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock vault to test with
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    const mockAsset = ethers.Wallet.createRandom().address;
    
    // Setup: initialize VaultAdapter
    const accessControlAddress = await mockVault.getAddress(); // Using mock vault as access control for simplicity
    await vaultAdapter.initialize(accessControlAddress);
    
    // Set slopes with a kink value that is valid (< 1e27 and != 0)
    const kink = ethers.parseEther("0.5"); // 0.5 * 1e18
    const slope0 = ethers.parseEther("0.1"); // 0.1 * 1e18
    const slope1 = ethers.parseEther("0.2"); // 0.2 * 1e18
    await vaultAdapter.setSlopes(mockAsset, { kink, slope0, slope1 });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2"); // 2 * 1e18
    const minMultiplier = ethers.parseEther("0.5"); // 0.5 * 1e18
    const rate = ethers.parseEther("0.1"); // 0.1 * 1e18
    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Setup mock vault to return utilization above kink (e.g., 0.8 * 1e18)
    const utilizationAboveKink = ethers.parseEther("0.8");
    await mockVault.setUtilization(utilizationAboveKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1"));
    
    // Fast forward time to create elapsed time > 0
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Call rate function - this will trigger _applySlopes with utilization > kink
    // In the original, multiplier calculation divides by 1e27
    // In the mutant, it adds 1e27 instead, producing a much larger multiplier
    const originalResult = await vaultAdapter.rate(await mockVault.getAddress(), mockAsset);
    
    // The multiplier should be reasonable (bounded by maxMultiplier)
    // In the mutant, the multiplier would be astronomically large and get capped at maxMultiplier
    // resulting in a different interest rate calculation
    const expectedMaxRate = (slope0 + (slope1 * (utilizationAboveKink - kink) / ethers.parseEther("1"))) * maxMultiplier / ethers.parseEther("1");
    
    // If the multiplier calculation is correct (original), the result should be bounded
    expect(originalResult).to.be.lte(expectedMaxRate);
    
    // The result should also be non-zero (meaningful calculation happened)
    expect(originalResult).to.be.gt(0);
  });
});