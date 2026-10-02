import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter - Kill mutant m0fc0bd85 (replace + with - in _applySlopes)", function () {
  it("should kill the mutant by verifying interest rate is higher when utilization exceeds kink (addition instead of subtraction)", async function () {
    const [owner, vault, asset] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Initialize the contract
    // First deploy a simple access control contract that allows all access
    const AccessControlFactory = await ethers.getContractFactory("AccessControlMock");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Grant access to setSlopes and setLimits selectors for the vault adapter
    const setSlopesSelector = ethers.id("setSlopes(address,(uint256,uint256,uint256))").substring(0, 10);
    const setLimitsSelector = ethers.id("setLimits(uint256,uint256,uint256)").substring(0, 10);
    const zeroSelector = "0x00000000";
    
    await accessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(setLimitsSelector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(zeroSelector, await vaultAdapter.getAddress(), owner.address);
    
    await vaultAdapter.initialize(await accessControl.getAddress());
    
    // Set slopes with kink = 0.5e27 (50%), slope0 = 0.1e27 (10%), slope1 = 0.5e27 (50%)
    const kink = ethers.parseEther("0.5");
    const slope0 = ethers.parseEther("0.1");
    const slope1 = ethers.parseEther("0.5");
    const slopes = { kink, slope0, slope1 };
    await vaultAdapter.setSlopes(asset.address, slopes);
    
    // Set limits: maxMultiplier = 2e27 (2x), minMultiplier = 0.5e27 (0.5x), rate = 0.1e27 (10%)
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("0.1");
    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);
    
    // We need a mock vault that returns utilization above kink
    // Deploy a simple mock vault
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Set utilization to 80% (above kink of 50%)
    const highUtilization = ethers.parseEther("0.8");
    await mockVault.setUtilization(highUtilization);
    
    // Set currentUtilizationIndex to a value that will cause the else branch
    // We want block.timestamp > utilizationData.lastUpdate, so we need to set lastUpdate to 0 initially
    // The currentUtilizationIndex should be set so that (index - 0) / elapsed = utilization
    // Let's set it so elapsed = 1 second, then index = highUtilization * 1 = highUtilization
    await mockVault.setCurrentUtilizationIndex(highUtilization);
    
    // Call rate function which triggers _applySlopes internally
    const interestRate = await vaultAdapter.rate(await mockVault.getAddress(), asset.address);
    
    // Calculate expected interest rate with addition: (slope0 + (slope1 * excess / 1e27)) * multiplier / 1e27
    // excess = utilization - kink = 0.8e27 - 0.5e27 = 0.3e27
    const excess = highUtilization - kink;
    // (slope1 * excess / 1e27) = 0.5e27 * 0.3e27 / 1e27 = 0.15e27
    const slopeTerm = (slope1 * excess) / ethers.parseEther("1");
    // slope0 + slopeTerm = 0.1e27 + 0.15e27 = 0.25e27
    const baseRate = slope0 + slopeTerm;
    
    // With initial multiplier = 0 (since first call), the multiplier calculation:
    // multiplier = 0 * (1e27 + (1e27 * excess / (1e27 - kink)) * elapsed * rate / 1e27) / 1e27
    // = 0 (since multiplier starts at 0 and multiplication by 0 yields 0)
    // So interestRate = baseRate * 0 / 1e27 = 0
    // This is because multiplier starts at 0 for first call
    
    // For the mutant with subtraction: baseRate = 0.1e27 - 0.15e27 = -0.05e27
    // This would underflow in uint256 or produce different result
    
    // To properly test, we need to call rate twice to have a non-zero multiplier
    // First call sets multiplier and index
    await vaultAdapter.rate(await mockVault.getAddress(), asset.address);
    
    // Update mock vault utilization index for second call
    // After first call, lastUpdate = block.timestamp, index = highUtilization
    // We need to advance time and set new index
    await ethers.provider.send("evm_increaseTime", [10]); // Advance 10 seconds
    await ethers.provider.send("evm_mine", []);
    
    const newUtilization = ethers.parseEther("0.9"); // Even higher utilization
    await mockVault.setUtilization(newUtilization);
    // New index = previous index + (newUtilization * elapsed)
    const elapsed = 10n;
    const newIndex = highUtilization + (newUtilization * elapsed);
    await mockVault.setCurrentUtilizationIndex(newIndex);
    
    // Call rate again
    const secondInterestRate = await vaultAdapter.rate(await mockVault.getAddress(), asset.address);
    
    // For the original (addition): baseRate will be positive
    // For the mutant (subtraction): baseRate could be negative causing underflow or different value
    // If subtraction causes underflow, the transaction would revert
    // If it wraps around (unlikely in Solidity 0.8+), the value would be astronomically large
    
    // The key assertion: with addition, the interest rate should be a reasonable positive number
    // With subtraction, it would either revert or produce an unexpected value
    // Since Solidity 0.8+ reverts on underflow, the mutant should cause a revert
    // But the original should succeed
    
    // Alternative: check that the rate is greater than slope0 (which would only happen with addition)
    // slope0 = 0.1e27, so rate should be > 0.1e27 with addition but could be < 0.1e27 with subtraction
    expect(secondInterestRate).to.be.gt(slope0, "Interest rate should be higher than slope0 when utilization exceeds kink (tests addition vs subtraction)");
  });
});

// Helper mock contracts (to be deployed in test environment)
// These would be separate Solidity files, but for the test we need them available