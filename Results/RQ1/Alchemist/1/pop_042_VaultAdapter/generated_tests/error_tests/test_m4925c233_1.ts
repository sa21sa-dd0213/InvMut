import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant killing test", function () {
  it("should kill mutant m4925c233 by verifying correct interest rate calculation when utilization is below kink", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock vault that returns known utilization values
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Initialize the VaultAdapter
    const accessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await accessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    await instance.initialize(await accessControl.getAddress());
    
    // Grant access to owner for setSlopes and setLimits
    await accessControl.grantAccess(instance.setSlopes.selector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(instance.setLimits.selector, await instance.getAddress(), owner.address);
    
    // Set slopes with kink = 0.5e27 (50%)
    const kink = ethers.parseEther("0.5");
    const slope0 = ethers.parseEther("0.1"); // 10% base rate
    const slope1 = ethers.parseEther("0.2"); // 20% slope above kink
    await instance.setSlopes(await mockVault.getAddress(), { kink, slope0, slope1 });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("0.01"); // 1% rate
    await instance.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Configure mock vault to return utilization = 0.3e27 (30%) which is below kink (50%)
    const utilization = ethers.parseEther("0.3");
    await mockVault.setUtilization(utilization);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1"));
    
    // Call rate function which triggers _applySlopes with utilization below kink
    // The original uses (kink - utilization) = 0.2e27 in denominator
    // The mutant uses (kink + utilization) = 0.8e27 in denominator, producing different result
    const result = await instance.rate(await mockVault.getAddress(), await mockVault.getAddress());
    
    // Calculate expected rate using original formula:
    // multiplier = 1e27 / (1e27 + (1e27 * (kink - utilization) / kink) * elapsed * rate / 1e27)
    // Since elapsed = 0 (first call), multiplier = 1e27
    // interestRate = (slope0 * utilization / kink) * multiplier / 1e27
    // = (0.1e27 * 0.3e27 / 0.5e27) * 1e27 / 1e27 = 0.06e27
    const expectedRate = ethers.parseEther("0.06");
    
    // The mutant would produce a different value due to the + instead of -
    expect(result).to.equal(expectedRate);
  });
});