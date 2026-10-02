import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant ma75d1ea0 test", function () {
  it("should detect mutant that replaces division with subtraction in _applySlopes else branch", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor args needed)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple mock vault for testing
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    
    // Setup access control - deploy a simple access control contract
    const AccessControl = await ethers.getContractFactory("SimpleAccessControl");
    const accessControl = await AccessControl.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize VaultAdapter
    await instance.initialize(await accessControl.getAddress());
    
    // Grant access for setSlopes and setLimits
    const setSlopesSelector = instance.interface.getFunction("setSlopes").selector;
    const setLimitsSelector = instance.interface.getFunction("setLimits").selector;
    await accessControl.grantAccess(setSlopesSelector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(setLimitsSelector, await instance.getAddress(), owner.address);
    
    // Setup slopes with a specific kink value
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.1"); // 10% base slope
    const slope1 = ethers.parseEther("0.2"); // 20% slope above kink
    
    await instance.setSlopes(await mockVault.getAddress(), {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("0.01");
    await instance.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Setup mock vault to return utilization below kink (e.g., 30%)
    const utilizationBelowKink = ethers.parseEther("0.3"); // 30% utilization
    await mockVault.setUtilization(utilizationBelowKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1"));
    
    // Call rate() - this will trigger the else branch (utilization < kink)
    const vaultAddress = await mockVault.getAddress();
    const assetAddress = await mockVault.getAddress();
    
    const interestRate = await instance.rate(vaultAddress, assetAddress);
    
    // Expected calculation with original division:
    // (slope0 * utilization / kink) * multiplier / 1e27
    // With default multiplier = 1e27 (1.0) and elapsed = 0:
    // (0.1 * 0.3 / 0.5) * 1.0 / 1 = 0.06
    const expectedRateWithDivision = ethers.parseEther("0.06");
    
    // The mutant would compute: (slope0 * utilization - kink) * multiplier / 1e27
    // = (0.1 * 0.3 - 0.5) * 1.0 / 1 = (0.03 - 0.5) = -0.47 (underflow or negative)
    
    // The original should return the correct value
    // The mutant would return a different value (likely very different due to subtraction)
    expect(interestRate).to.equal(expectedRateWithDivision);
  });
});