import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant kill test - _applySlopes above kink branch", function () {
  it("should revert or return wrong interest rate when utilization is below kink but mutant uses above-kink branch", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock vault contract to test with
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    
    // Setup access control
    const AccessControlFactory = await ethers.getContractFactory("AccessControlMock");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize VaultAdapter
    await instance.initialize(await accessControl.getAddress());
    
    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = instance.interface.getFunction("setSlopes").selector;
    const setLimitsSelector = instance.interface.getFunction("setLimits").selector;
    await accessControl.grantAccess(setSlopesSelector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(setLimitsSelector, await instance.getAddress(), owner.address);
    
    // Setup slopes with a specific kink
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.05"); // 5% base slope
    const slope1 = ethers.parseEther("0.1"); // 10% slope above kink
    
    await instance.setSlopes(await mockVault.getAddress(), {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("0.1");
    await instance.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Set utilization below kink (e.g., 30%) in mock vault
    const utilizationBelowKink = ethers.parseEther("0.3"); // 30% utilization
    await mockVault.setUtilization(utilizationBelowKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1"));
    
    // Call rate function - should use below-kink formula
    // For below kink: interestRate = (slope0 * utilization / kink) * multiplier / 1e27
    // Expected: (0.05 * 0.3 / 0.5) * 1 / 1e27 = 0.03 * 1 / 1e27 = 0.03 ether (3%)
    const result = await instance.rate(await mockVault.getAddress(), await mockVault.getAddress());
    
    // If mutant uses above-kink branch (true always), it will calculate differently:
    // interestRate = (slope0 + (slope1 * excess / 1e27)) * multiplier / 1e27
    // where excess = utilization - kink = 0 (since utilization < kink)
    // This would give (0.05 + 0) * 1 / 1e27 = 0.05 ether (5%)
    // So expected correct value is 0.03 ether, mutant gives 0.05 ether
    const expectedBelowKinkRate = ethers.parseEther("0.03"); // 3%
    const expectedAboveKinkRate = ethers.parseEther("0.05"); // 5%
    
    // Assert that result is the below-kink rate, not the above-kink rate
    expect(result).to.equal(expectedBelowKinkRate);
    expect(result).to.not.equal(expectedAboveKinkRate);
  });
});