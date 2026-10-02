import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant mf434515d test", function () {
  it("should kill mutant by detecting inverted conditional logic when utilization is above kink", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy VaultAdapter (constructor has no arguments, uses _disableInitializers())
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a simple mock vault to test with
    // We'll deploy a minimal contract that implements IVault interface
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy a mock access control for initialization
    const MockAccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const mockAccessControl = await MockAccessControlFactory.deploy();
    await mockAccessControl.waitForDeployment();
    
    // Initialize VaultAdapter
    await vaultAdapter.initialize(await mockAccessControl.getAddress());
    
    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = ethers.id("setSlopes(address,(uint256,uint256,uint256))").slice(0, 10);
    const setLimitsSelector = ethers.id("setLimits(uint256,uint256,uint256)").slice(0, 10);
    const rateSelector = ethers.id("rate(address,address)").slice(0, 10);
    
    await mockAccessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);
    await mockAccessControl.grantAccess(setLimitsSelector, await vaultAdapter.getAddress(), owner.address);
    await mockAccessControl.grantAccess(rateSelector, await vaultAdapter.getAddress(), owner.address);
    
    // Set slopes: kink at 50% (5e26 in 1e27 precision), slope0=0.05, slope1=1.0
    const kink = ethers.parseEther("0.5"); // 5e26 in 1e27 precision
    const slope0 = ethers.parseEther("0.05");
    const slope1 = ethers.parseEther("1.0");
    
    await vaultAdapter.setSlopes(await mockVault.getAddress(), {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits: maxMultiplier=2e27, minMultiplier=0.5e27, rate=0.1e27
    await vaultAdapter.setLimits(
      ethers.parseEther("2"),
      ethers.parseEther("0.5"),
      ethers.parseEther("0.1")
    );
    
    // Configure mock vault to return utilization above kink (80%)
    const utilizationAboveKink = ethers.parseEther("0.8"); // 80% utilization
    await mockVault.setUtilization(utilizationAboveKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("100"));
    
    // Call rate function - this should use the high utilization branch
    // In original: utilization > kink (80% > 50%) => uses slope1 branch
    // In mutant: utilization < kink (80% < 50%) is FALSE => uses else branch (incorrect)
    
    const rate = await vaultAdapter.rate(await mockVault.getAddress(), await mockVault.getAddress());
    
    // The rate should be calculated using the high utilization formula
    // With 80% utilization and kink at 50%, excess = 30%
    // Original: interestRate = (slope0 + (slope1 * excess / 1e27)) * multiplier / 1e27
    // With initial multiplier = 1e27, this gives approximately 0.05 + 1.0 * 0.3 = 0.35
    // Mutant would use low utilization formula giving approximately 0.05 * 0.8 / 0.5 = 0.08
    
    // The mutant would produce a significantly lower rate
    // We expect the rate to be around 0.35e27 for the original
    const expectedHighRate = ethers.parseEther("0.3"); // Minimum expected rate from high utilization branch
    expect(rate).to.be.gte(expectedHighRate);
    
    // Now test with utilization below kink
    await mockVault.setUtilization(ethers.parseEther("0.3")); // 30% utilization
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("200"));
    
    const rateBelow = await vaultAdapter.rate(await mockVault.getAddress(), await mockVault.getAddress());
    
    // With 30% utilization and kink at 50%, this should use the low utilization branch
    // Original: interestRate = (slope0 * utilization / kink) * multiplier / 1e27
    // = 0.05 * 0.3 / 0.5 = 0.03
    // Mutant would incorrectly use high utilization branch giving ~0.05 + 1.0 * (-0.2) which would underflow
    
    const expectedLowRate = ethers.parseEther("0.01"); // Minimum expected rate from low utilization branch
    expect(rateBelow).to.be.lte(expectedLowRate);
  });
});