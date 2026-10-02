import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m13e52f45 test", function () {
  it("should detect the mutant that changes * to + in _applySlopes when utilization exceeds kink", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy VaultAdapter (constructor takes no arguments, just calls _disableInitializers)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock vault that implements IVault interface
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Setup: initialize the VaultAdapter
    // We need an access control contract - deploy a simple one or use the deployer as admin
    // For simplicity, we'll deploy a minimal access control that allows all
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize the VaultAdapter with the access control
    await instance.initialize(await accessControl.getAddress());
    
    // Set slopes for an asset
    const asset = addr1.address; // Use any address as asset
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.1"); // 10% base slope
    const slope1 = ethers.parseEther("0.5"); // 50% slope above kink
    
    await instance.setSlopes(asset, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2"); // 2x max multiplier
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x min multiplier
    const rate = ethers.parseEther("0.01"); // 1% rate
    
    await instance.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Configure mock vault to return high utilization (above kink)
    const utilizationAboveKink = ethers.parseEther("0.8"); // 80% utilization
    const currentIndex = ethers.parseEther("1000"); // Some index value
    
    await mockVault.setUtilization(utilizationAboveKink);
    await mockVault.setCurrentUtilizationIndex(currentIndex);
    
    // First call to rate() will have lastUpdate = 0, so it will use the else branch
    // and get utilization from vault, elapsed = 0
    const vaultAddress = await mockVault.getAddress();
    await instance.rate(vaultAddress, asset);
    
    // Second call: advance time so that block.timestamp > lastUpdate
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Get the expected result using the original formula:
    // excess = utilization - kink = 0.8 - 0.5 = 0.3
    // multiplier = 1 * (1e27 + (1e27 * 0.3 / 0.5) * 3600 * 0.01 / 1e27) / 1e27
    // In original: multiplier = 1 * (1e27 + (0.6e27) * 3600 * 0.01 / 1e27) / 1e27
    // In mutant:   multiplier = 1 * (1e27 + (0.6e27) * 3600 + 0.01 / 1e27) / 1e27
    // These will give different results, so the test will detect the mutant
    
    // Call rate() and verify the result matches the original formula
    // The mutant will produce a different value, causing the test to fail
    const result = await instance.rate(vaultAddress, asset);
    
    // Calculate expected value using original formula
    const excess = utilizationAboveKink - kink; // 0.3e18
    const expectedMultiplier = ethers.parseEther("1"); // Initial multiplier is 1
    // Original formula: multiplier * (1e27 + (1e27 * excess / (1e27 - kink)) * elapsed * rate / 1e27) / 1e27
    const numerator = ethers.parseEther("1") + (ethers.parseEther("1") * excess / (ethers.parseEther("1") - kink)) * BigInt(3600) * rate / ethers.parseEther("1");
    const newMultiplier = expectedMultiplier * numerator / ethers.parseEther("1");
    const cappedMultiplier = newMultiplier > maxMultiplier ? maxMultiplier : newMultiplier;
    const expectedRate = (slope0 + (slope1 * excess / ethers.parseEther("1"))) * cappedMultiplier / ethers.parseEther("1");
    
    // The mutant will produce a different result, so expect the actual to NOT equal expected
    // This test will pass on original (result matches) but fail on mutant (result differs)
    expect(result).to.equal(expectedRate);
  });
});