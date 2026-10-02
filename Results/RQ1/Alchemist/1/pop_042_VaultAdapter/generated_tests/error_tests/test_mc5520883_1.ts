import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant mc5520883 - exponentiation vs multiplication", function () {
  it("should kill the mutant by detecting incorrect interest rate calculation when exponentiation replaces multiplication", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter (constructor has no arguments since it only calls _disableInitializers())
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock access control contract that grants access to everyone
    const AccessControlFactory = await ethers.getContractFactory("IAccessControl");
    // Since we can't deploy interface directly, we'll deploy a minimal access control
    const MinimalAccessControl = await ethers.getContractFactory("MinimalAccessControl");
    const accessControl = await MinimalAccessControl.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize the VaultAdapter
    await instance.initialize(await accessControl.getAddress());
    
    // Deploy a mock vault for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    const vaultAddress = await mockVault.getAddress();
    
    // Set up slopes for an asset
    const testAsset = addr1.address;
    const slopes = {
      kink: ethers.parseEther("0.5"), // 50% utilization kink
      slope0: ethers.parseEther("0.05"), // 5% base slope
      slope1: ethers.parseEther("0.5"), // 50% slope above kink
    };
    
    await instance.setSlopes(testAsset, slopes);
    
    // Set limits with a non-zero rate to trigger the mutated calculation
    // The rate parameter affects the multiplier decay/growth calculation
    const maxMultiplier = ethers.parseEther("2"); // 2x
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x
    const rate = ethers.parseEther("0.1"); // 10% rate - this value will be exponentiated in mutant
    
    await instance.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Set up the mock vault to return specific utilization values
    // First, set the utilization index to simulate time passing
    const initialUtilization = ethers.parseEther("0.6"); // 60% utilization (above kink)
    await mockVault.setUtilization(initialUtilization);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.0"));
    
    // Call rate() to initialize the storage with lastUpdate = current timestamp
    // This will set utilizationData.index and utilizationData.lastUpdate
    await instance.rate(vaultAddress, testAsset);
    
    // Fast forward time by 100 seconds to create a non-zero _elapsed value
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);
    
    // Set a new utilization index to create a delta that will be used in the calculation
    // The index increased by 0.05 over 100 seconds = 0.0005 per second utilization
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.05"));
    await mockVault.setUtilization(ethers.parseEther("0.65"));
    
    // Call rate() again - this will trigger the _applySlopes with _elapsed = 100
    // The mutated code will compute _elapsed ** $.rate = 100 ** 0.1 = ~1.58
    // The original code will compute _elapsed * $.rate = 100 * 0.1 = 10
    // This significant difference should be detectable
    const result = await instance.rate(vaultAddress, testAsset);
    
    // Calculate expected result using original multiplication logic:
    // For utilization > kink:
    // excess = 0.65 - 0.5 = 0.15
    // multiplier update = multiplier * (1e27 + (1e27 * excess / (1e27 - kink)) * elapsed * rate / 1e27) / 1e27
    // With initial multiplier = 1e27, elapsed = 100, rate = 0.1e27
    // Original: 1e27 * (1e27 + (1e27 * 0.15e27 / 0.5e27) * 100 * 0.1e27 / 1e27) / 1e27
    // = 1e27 * (1e27 + (0.3e27) * 10) / 1e27
    // = 1e27 * (1e27 + 3e27) / 1e27 = 4e27
    // Mutant would use: 100 ** 0.1e27 instead of 100 * 0.1e27
    
    // The result should not be zero (a basic sanity check)
    expect(result).to.not.equal(0);
    
    // The key assertion: the mutant produces a mathematically different result
    // Since we can't know the exact expected value without running the original,
    // we verify the result is in a reasonable range for the original calculation
    // The original would produce a multiplier of ~4x leading to interest rate = (0.05e27 + (0.5e27 * 0.15e27 / 1e27)) * 4 / 1e27
    // = (0.05e27 + 0.075e27) * 4 / 1e27 = 0.5e27
    // The mutant would produce a much smaller result due to exponentiation
    
    // To definitively kill the mutant, we compute what the original should be
    // and assert the result matches the original logic
    const expectedExcess = ethers.parseEther("0.15");
    const expectedSlopePart = slopes.slope0 + (slopes.slope1 * expectedExcess / ethers.parseEther("1"));
    const expectedMultiplier = ethers.parseEther("4"); // As calculated above
    const expectedRate = expectedSlopePart * expectedMultiplier / ethers.parseEther("1");
    
    // This assertion will fail on the mutant because exponentiation gives different result
    // Note: This is a simplified check - actual precision may vary
    expect(result).to.be.closeTo(expectedRate, ethers.parseEther("0.1"));
  });
});