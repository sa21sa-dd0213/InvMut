import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant kill test - mc45a7140", function () {
  it("should kill mutant by testing rate() when utilization is below kink with elapsed time", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy VaultAdapter (constructor has no arguments, just calls _disableInitializers())
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock vault for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Initialize VaultAdapter with access control
    const AccessControlFactory = await ethers.getContractFactory("AccessControlMock");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Grant access to the owner for setSlopes and setLimits
    await accessControl.grantAccess(instance.setSlopes.selector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(instance.setLimits.selector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(ethers.ZeroHash, await instance.getAddress(), owner.address);
    
    await instance.initialize(await accessControl.getAddress());
    
    // Setup slopes and limits
    const kink = ethers.parseEther("0.8"); // 80% utilization kink
    const slope0 = ethers.parseEther("0.05"); // 5% base slope
    const slope1 = ethers.parseEther("0.5"); // 50% slope above kink
    
    await instance.setSlopes(
      await mockVault.getAddress(),
      { kink, slope0, slope1 }
    );
    
    const maxMultiplier = ethers.parseEther("5"); // 5x
    const minMultiplier = ethers.parseEther("0.2"); // 0.2x
    const rate = ethers.parseEther("0.1"); // 10% rate
    
    await instance.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Setup mock vault to return utilization below kink (e.g., 50%)
    const utilizationBelowKink = ethers.parseEther("0.5"); // 50% utilization
    await mockVault.setUtilization(utilizationBelowKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.0")); // Initial index
    
    // First call to rate() to initialize the utilizationData
    const vaultAddress = await mockVault.getAddress();
    const assetAddress = await mockVault.getAddress();
    await instance.rate(vaultAddress, assetAddress);
    
    // Advance time to have elapsed > 0
    await ethers.provider.send("evm_increaseTime", [100]); // 100 seconds
    await ethers.provider.send("evm_mine", []);
    
    // Set a new utilization index to simulate change
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.05")); // Increased index
    
    // Call rate() and capture the result
    const result = await instance.rate(vaultAddress, assetAddress);
    
    // Expected behavior: with utilization below kink, the multiplier should decrease
    // due to the formula: multiplier = multiplier * 1e27 / (1e27 + (1e27 * (kink - utilization) / kink) * elapsed * rate / 1e27)
    // The mutant changes 1e27 * (kink - utilization) to 1e27 + (kink - utilization)
    // This makes the denominator much larger, causing the multiplier to shrink more aggressively
    // We expect the result to be different from what the mutant would produce
    
    // Verify the result is reasonable (not zero, not enormous)
    expect(result).to.be.gt(0);
    expect(result).to.be.lt(ethers.parseEther("1")); // Interest rate should be less than 100%
    
    // The mutant would produce a significantly different result
    // For the original: denominator = 1e27 + (1e27 * (0.8 - 0.5) / 0.8) * 100 * 0.1 / 1e27
    // For the mutant: denominator = 1e27 + (1e27 + (0.8 - 0.5) / 0.8) * 100 * 0.1 / 1e27
    // The mutant's denominator is much larger, so multiplier shrinks more, giving lower interest rate
    // We can verify by checking the result is above a threshold that the mutant would fall below
    
    // Calculate expected approximate result for original
    // Initial multiplier = 1e27 (1.0 in ethers)
    // kink = 0.8e27, utilization = 0.5e27
    // kink - utilization = 0.3e27
    // (kink - utilization) / kink = 0.3 / 0.8 = 0.375
    // elapsed = 100, rate = 0.1e27
    // Original denominator = 1e27 + (1e27 * 0.375) * 100 * 0.1 / 1e27 = 1e27 + 3.75e27 = 4.75e27
    // New multiplier = 1e27 * 1e27 / 4.75e27 = 0.2105e27 (above minMultiplier of 0.2e27)
    // interestRate = (0.05e27 * 0.5e27 / 0.8e27) * 0.2105e27 / 1e27 = 0.006578e27
    
    // Mutant denominator = 1e27 + (1e27 + 0.375) * 100 * 0.1 / 1e27 = 1e27 + 100.0375 = 1e27 + 100.0375
    // (Note: the addition happens before multiplication by elapsed * rate)
    // Mutant denominator = 1e27 + (1e27 + 0.375) * 100 * 0.1 / 1e27
    // = 1e27 + (1.000000000000000000375e27) * 10 / 1e27
    // = 1e27 + 10.00000000000000000375
    // = ~1e27 + 10 (approximately)
    // New multiplier = 1e27 * 1e27 / ~1e27+10 = ~1e27 - 10 (almost no change)
    // interestRate = (0.05e27 * 0.5e27 / 0.8e27) * ~1e27 / 1e27 = 0.03125e27
    
    // So mutant gives ~0.03125, original gives ~0.006578
    // The difference is significant enough to detect
    
    expect(result).to.be.approximately(ethers.parseEther("0.006578"), ethers.parseEther("0.001"));
  });
});