import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant detection - m9a5856a4", function () {
  it("should detect exponentiation operator mutation in _applySlopes else branch", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy VaultAdapter
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock vault contract that implements IVault
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy a mock access control contract
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
    
    // Setup slopes with kink and slopes
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.05"); // 5% base slope
    const slope1 = ethers.parseEther("0.1"); // 10% slope above kink
    
    const assetAddress = addr1.address;
    await vaultAdapter.setSlopes(assetAddress, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2"); // 2x max
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x min
    const rate = ethers.parseEther("0.1"); // 10% rate
    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Configure mock vault to return utilization below kink (e.g., 30%)
    const utilizationBelowKink = ethers.parseEther("0.3"); // 30% utilization
    const currentIndex = ethers.parseEther("1.0"); // Some index value
    
    await mockVault.setUtilization(utilizationBelowKink);
    await mockVault.setCurrentUtilizationIndex(currentIndex);
    
    // Call rate function - this will trigger the else branch (utilization < kink)
    const vaultAddress = await mockVault.getAddress();
    const rateResult = await vaultAdapter.rate(vaultAddress, assetAddress);
    
    // Calculate expected interest rate using multiplication (original behavior)
    // interestRate = (slopes.slope0 * _utilization / slopes.kink) * utilizationData.multiplier / 1e27
    // With initial multiplier = 1e27 (default), the calculation is:
    // = (0.05e18 * 0.3e18 / 0.5e18) * 1e27 / 1e27
    // = (0.015e18) * 1
    // = 0.015e18 = 1.5e16
    
    const expectedRate = slope0 * utilizationBelowKink / kink; // = 0.05e18 * 0.3e18 / 0.5e18 = 0.03e18 = 3e16
    
    // The mutant would compute: (slope0 * utilization / kink) ** multiplier / 1e27
    // With multiplier = 1e27 initially: (0.03e18) ** 1e27 / 1e27 which would overflow or give wrong result
    // The original should give expectedRate
    
    // If the mutant is present, the result will be drastically different
    // The exponentiation would produce an astronomically large number or cause overflow
    // We expect the original behavior to match our calculation
    expect(rateResult).to.equal(expectedRate);
    
    // Additional verification: Call rate again to trigger multiplier update
    const secondRateResult = await vaultAdapter.rate(vaultAddress, assetAddress);
    
    // The multiplier should have been updated and the calculation should still use multiplication
    // The mutant would produce different results on the second call as well
    expect(secondRateResult).to.not.equal(0);
    
    // Verify that the result is reasonable (not astronomically large)
    expect(secondRateResult).to.be.lessThan(ethers.parseEther("100"));
  });
});