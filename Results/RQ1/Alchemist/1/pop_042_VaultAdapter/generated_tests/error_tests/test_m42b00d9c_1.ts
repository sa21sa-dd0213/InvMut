import { expect } from "chai";
import { ethers } } from "hardhat";

describe("VaultAdapter mutant m42b00d9c - boundary condition", function () {
  it("should use the correct branch when utilization equals kink exactly", async function () {
    const [owner, vault, user] = await ethers.getSigners();
    
    // Deploy VaultAdapter
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock vault for testing
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    
    // Initialize the VaultAdapter
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    await instance.initialize(await accessControl.getAddress());
    
    // Grant access to owner for setting slopes
    await accessControl.grantAccess(instance.setSlopes.selector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(instance.setLimits.selector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(ethers.ZeroHash, await instance.getAddress(), owner.address);
    
    // Set slopes with kink = 0.5e27 (50%)
    const kink = ethers.parseEther("0.5");
    const slope0 = ethers.parseEther("0.1");
    const slope1 = ethers.parseEther("0.2");
    
    const assetAddress = ethers.Wallet.createRandom().address;
    await instance.setSlopes(assetAddress, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("0.1");
    await instance.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Set up the mock vault to return utilization exactly equal to kink
    // The mock vault will return currentUtilizationIndex = 0, and utilization = kink
    await mockVault.setUtilization(kink);
    await mockVault.setCurrentUtilizationIndex(0);
    
    // Call rate() which will trigger _applySlopes with utilization == kink
    // In the original code, utilization == kink goes to the else branch (below kink)
    // In the mutant, utilization == kink goes to the if branch (above or equal to kink)
    const vaultAddress = await mockVault.getAddress();
    const result = await instance.rate(vaultAddress, assetAddress);
    
    // Calculate expected result for original code (utilization <= kink branch):
    // multiplier = initialMultiplier * 1e27 / (1e27 + (1e27 * (kink - utilization) / kink) * elapsed * rate / 1e27)
    // With utilization == kink, (kink - utilization) = 0, so multiplier stays at 1e27 (initial)
    // interestRate = (slope0 * utilization / kink) * multiplier / 1e27
    // = (0.1e27 * 0.5e27 / 0.5e27) * 1e27 / 1e27 = 0.1e27
    
    const expectedRate = ethers.parseEther("0.1");
    
    expect(result).to.equal(expectedRate);
    
    // Additionally, verify that calling rate again with a slightly higher utilization (above kink) 
    // gives a different result, confirming the boundary is correct
    await mockVault.setUtilization(kink + 1n); // Just above kink
    const resultAbove = await instance.rate(vaultAddress, assetAddress);
    expect(resultAbove).to.not.equal(expectedRate);
  });
});

// Mock contracts needed for testing
// Note: These should be deployed as separate contracts, but for the test to work,
// we need mock implementations of IVault and IAccessControl