import { expect } from "chai";
import { ethers } } from "hardhat";

describe("VaultAdapter mutant m35f3c742 test", function () {
  it("should detect the mutant by verifying multiplier decreases over time when utilization is below kink", async function () {
    const [owner, vault, asset] = await ethers.getSigners();
    
    // Deploy VaultAdapter
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const adapter = await VaultAdapterFactory.deploy();
    await adapter.waitForDeployment();
    
    // Deploy a mock vault contract that returns utilization values
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Initialize VaultAdapter
    const AccessControlFactory = await ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    await adapter.initialize(await accessControl.getAddress());
    
    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = adapter.interface.getFunction("setSlopes").selector;
    const setLimitsSelector = adapter.interface.getFunction("setLimits").selector;
    await accessControl.grantAccess(setSlopesSelector, await adapter.getAddress(), owner.address);
    await accessControl.grantAccess(setLimitsSelector, await adapter.getAddress(), owner.address);
    
    // Set slopes with kink at 50% (0.5e27)
    const kink = ethers.parseEther("0.5");
    const slope0 = ethers.parseEther("0.1"); // 10% base rate
    const slope1 = ethers.parseEther("0.2"); // 20% slope above kink
    
    await adapter.setSlopes(asset.address, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2"); // 2x
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x
    const rate = ethers.parseEther("0.1"); // 10% decay rate
    
    await adapter.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Configure mock vault to return utilization below kink (30%)
    const utilizationBelowKink = ethers.parseEther("0.3");
    await mockVault.setUtilization(asset.address, utilizationBelowKink);
    await mockVault.setCurrentUtilizationIndex(asset.address, ethers.parseEther("1"));
    
    // First call to rate() - initializes utilization data
    await adapter.rate(await vault.getAddress(), asset.address);
    
    // Get the initial multiplier by calling rate again immediately
    const initialRate = await adapter.rate(await vault.getAddress(), asset.address);
    
    // Advance time by 1 hour
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine");
    
    // Update mock vault utilization index to simulate time passing
    await mockVault.setCurrentUtilizationIndex(asset.address, ethers.parseEther("1.0001"));
    
    // Call rate() again after time has passed
    const subsequentRate = await adapter.rate(await vault.getAddress(), asset.address);
    
    // In the original contract, the multiplier should decrease over time
    // In the mutant, the multiplier may increase or cause a revert
    expect(subsequentRate).to.be.lessThan(initialRate);
  });
});