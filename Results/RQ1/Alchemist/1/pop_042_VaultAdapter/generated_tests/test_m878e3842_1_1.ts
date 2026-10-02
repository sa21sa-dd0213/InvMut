import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m878e3842 detection", function () {
  it("should detect the * vs + mutation in _applySlopes when excess = 1e27 - kink", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments as per the actual contract)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock vault to satisfy the IVault interface
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Setup: Initialize the vault adapter
    const accessControlAddress = owner.address; // Using owner as access control for simplicity
    await vaultAdapter.initialize(accessControlAddress);

    // Grant access to owner for setSlopes and setLimits
    // Note: In real scenario, we'd need proper access control setup
    // For this test, we assume owner has the necessary access

    const asset = addr1.address;
    const vault = await mockVault.getAddress();

    // Set slopes with a specific kink value
    const kink = ethers.parseEther("0.5"); // 0.5 * 1e18, but need 1e27 precision
    // Convert to 1e27 precision (18 decimals -> 27 decimals)
    const kink27 = kink * BigInt(10**9); // Scale from 1e18 to 1e27
    const slope0 = ethers.parseEther("0.1"); // 0.1 * 1e18
    const slope1 = ethers.parseEther("0.2"); // 0.2 * 1e18

    await vaultAdapter.setSlopes(asset, {
      kink: kink27,
      slope0: slope0,
      slope1: slope1
    });

    // Set limits to allow multiplier to grow without capping
    const maxMultiplier = ethers.parseEther("1000000"); // Large max multiplier
    const minMultiplier = ethers.parseEther("0.01");
    const rate = ethers.parseEther("1"); // 1 * 1e18, need to scale to 1e27
    const rate27 = rate * BigInt(10**9); // Scale to 1e27

    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate27);

    // Calculate excess such that: 1e27 * excess / (1e27 - kink) = 1e27
    // This means: excess = (1e27 - kink)
    const oneE27 = BigInt(10**27);
    const excess = oneE27 - kink27;

    // Set utilization to be greater than kink by the calculated excess
    // utilization = kink + excess
    const utilization = kink27 + excess;

    // Set elapsed time to 1 second
    const elapsed = BigInt(1);

    // Set up mock vault to return the utilization we want
    await mockVault.setUtilization(asset, utilization);
    await mockVault.setCurrentUtilizationIndex(asset, BigInt(0)); // Initial index

    // Call rate function which internally calls _applySlopes
    // The original code would compute: multiplier * (1e27 + 1e27) / 1e27 = multiplier * 2
    // The mutant would compute: multiplier * (1e27 * 1e27) / 1e27 = multiplier * 1e27
    // This should produce a massive difference in the result

    const result = await vaultAdapter.rate(vault, asset);

    // The original would produce a reasonable value, mutant would produce extremely large value
    // For the original with these parameters, the multiplier would approximately double
    // For the mutant, the multiplier would increase by factor of 1e27

    // Expected behavior for original: result should be relatively small
    // Expected behavior for mutant: result would be astronomically large
    // If result is extremely large (> 1e30), it's likely the mutant

    // We can check if the result is reasonable (original) or unreasonable (mutant)
    const reasonableThreshold = ethers.parseEther("100"); // Some reasonable upper bound
    expect(result).to.be.lessThan(reasonableThreshold, 
      "Result is too large - likely the mutant with * instead of +");
  });
});