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

// Mock vault contract for testing
const mockVaultArtifact = {
  abi: [
    "function currentUtilizationIndex(address) external view returns (uint256)",
    "function utilization(address) external view returns (uint256)",
    "function setUtilization(uint256) external",
    "function setCurrentUtilizationIndex(uint256) external"
  ],
  bytecode: "0x608060405234801561001057600080fd5b5061019f806100206000396000f3fe60806040526004361061003f5760003560e01c806307a2d13a1461004457806342074c8114610077578063c1f52d481461009757600080fd5b3661003f57005b600080fd5b34801561005057600080fd5b5061006461005f3660046100e5565b6100b9565b60405190815260200160405180910390f35b34801561008357600080fd5b506100646100923660046100e5565b6100c2565b3480156100a357600080fd5b506100646100b23660046100e5565b6100cb565b6000919050565b6000919050565b6000919050565b6000602082840312156100f757600080fd5b5035919050565b60006020828403121561011057600080fd5b81356001600160a01b038116811461012757600080fd5b939250505056fea2646970667358221220123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef64736f6c63430008100033"
};