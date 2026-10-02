import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant detection - me64f7f79", function () {
  it("should detect exponentiation vs multiplication bug in _applySlopes when utilization is below kink", async function () {
    const [owner, vault, asset] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock vault that returns utilization data
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    
    // Initialize the VaultAdapter
    await instance.initialize(owner.address);
    
    // Set slopes with kink = 5e26 (50% in 1e27 precision)
    const kink = ethers.parseEther("0.5");
    const slope0 = ethers.parseEther("0.1");
    const slope1 = ethers.parseEther("0.2");
    await instance.setSlopes(asset.address, { kink, slope0, slope1 });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("1");
    await instance.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Set up mock vault to return utilization below kink (e.g., 30%)
    const utilization = ethers.parseEther("0.3");
    await mockVault.setUtilization(asset.address, utilization);
    await mockVault.setCurrentUtilizationIndex(asset.address, 1000);
    
    // Fast forward time to create elapsed time
    await ethers.provider.send("evm_increaseTime", [100]); // 100 seconds
    await ethers.provider.send("evm_mine", []);
    
    // Call rate function - this will use _applySlopes with utilization below kink
    const result = await instance.rate(mockVault.target, asset.address);
    
    // The expected calculation (using multiplication):
    // multiplier = 1e27 / (1e27 + (1e27 * (5e26 - 3e26) / 5e26) * 100 * 1e27 / 1e27)
    // = 1e27 / (1e27 + (2e26) * 100)
    // = 1e27 / (1e27 + 2e28)
    // ≈ 0.0476... * 1e27
    const expectedMultiplier = ethers.parseEther("0.0476"); // approximate
    
    // If exponentiation was used instead: _elapsed ** $.rate = 100 ** 1e27
    // This would overflow or produce astronomically large numbers
    // So if the result is a reasonable number (not overflow/max), the multiplication was used
    expect(result).to.be.lessThan(ethers.parseEther("100")); // Reasonable result
    expect(result).to.be.greaterThan(0); // Positive result
    
    // Verify the exact expected value based on multiplication formula
    const slopePart = (slope0 * utilization / kink);
    const expectedRate = slopePart * expectedMultiplier / ethers.parseEther("1");
    expect(result).to.be.closeTo(expectedRate, ethers.parseEther("0.001"));
  });
});