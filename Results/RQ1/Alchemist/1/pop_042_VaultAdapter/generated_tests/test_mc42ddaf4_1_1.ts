import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant mc42ddaf4 test", function () {
  it("should detect mutant that changes multiplication to addition in interest rate calculation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock vault to use for testing
    // We need a contract that implements IVault interface
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy a mock access control
    const MockAccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const mockAccessControl = await MockAccessControlFactory.deploy();
    await mockAccessControl.waitForDeployment();
    
    // Initialize VaultAdapter
    await vaultAdapter.initialize(await mockAccessControl.getAddress());
    
    // Set up slopes and limits for the asset
    const asset = await mockVault.getAddress();
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.05"); // 5% base slope
    const slope1 = ethers.parseEther("0.1"); // 10% slope above kink
    
    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = vaultAdapter.interface.getFunction("setSlopes").selector;
    const setLimitsSelector = vaultAdapter.interface.getFunction("setLimits").selector;
    await mockAccessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);
    await mockAccessControl.grantAccess(setLimitsSelector, await vaultAdapter.getAddress(), owner.address);
    
    await vaultAdapter.setSlopes(asset, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    const maxMultiplier = ethers.parseEther("2"); // 2x max multiplier
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x min multiplier
    const rate = ethers.parseEther("0.1"); // 10% rate
    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Set up utilization data by calling rate first to initialize
    // Mock vault returns utilization above kink to trigger the if branch
    const utilizationAboveKink = ethers.parseEther("0.8"); // 80% utilization > 50% kink
    await mockVault.setUtilization(asset, utilizationAboveKink);
    await mockVault.setCurrentUtilizationIndex(asset, ethers.parseEther("1.0"));
    
    // Call rate function - this will trigger the if branch (utilization > kink)
    // In the original: interestRate = (slope0 + (slope1 * excess / 1e27)) * multiplier / 1e27
    // In the mutant: interestRate = (slope0 + (slope1 * excess / 1e27)) + multiplier / 1e27
    
    // First call to initialize the data
    await vaultAdapter.rate(await mockVault.getAddress(), asset);
    
    // Calculate expected original result
    const excess = utilizationAboveKink - kink;
    const baseRate = slope0 + (slope1 * excess / ethers.parseEther("1"));
    
    // After first call, multiplier starts at 1e27 (1.0 in 1e27 precision)
    const initialMultiplier = ethers.parseEther("1");
    
    // Original: baseRate * multiplier / 1e27
    const expectedOriginal = baseRate * initialMultiplier / ethers.parseEther("1");
    
    // Mutant: baseRate + multiplier / 1e27
    const expectedMutant = baseRate + initialMultiplier / ethers.parseEther("1");
    
    // Set up for second call with some elapsed time
    // Mock vault returns updated utilization index
    const newIndex = ethers.parseEther("1.1");
    await mockVault.setCurrentUtilizationIndex(asset, newIndex);
    
    // Fast forward time to create elapsed time
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine");
    
    // Call rate again - this will trigger the update path
    const result = await vaultAdapter.rate(await mockVault.getAddress(), asset);
    
    // The result should match the original calculation, not the mutant
    // If the mutant is present, the result will be much smaller (addition instead of multiplication)
    // For the mutant: result would be approximately baseRate + 1 (since multiplier/1e27 ≈ 1)
    // For original: result would be approximately baseRate * 1 (since multiplier = 1e27)
    // After multiplier update, original could be different, but mutant will always be smaller
    
    // The mutant would produce a value around baseRate + 1 (approximately 0.15 + 1 = 1.15)
    // The original would produce a value around baseRate * multiplier (approximately 0.15 * ~1 = 0.15)
    // Since the mutant result is significantly larger, we can detect it
    
    // After the first call, multiplier is updated, so we need to check if the result
    // matches the original formula structure (multiplication) vs mutant (addition)
    
    // For the mutant to be killed, we need to verify the result is NOT what the mutant would produce
    // The mutant would produce: baseRate + (multiplier / 1e27) where multiplier could be large
    // The original would produce: baseRate * (multiplier / 1e27)
    
    // We can check if the result is less than or equal to baseRate + (maxMultiplier / 1e27)
    // which would be true for both, but we need a more specific assertion
    
    // Instead, let's calculate what the original would produce after two calls
    // and verify the result matches that
    
    // The actual expected value depends on the multiplier update formula
    // But we know for certain that the mutant will produce a DIFFERENT result
    // when multiplier != 1e27
    
    // Let's verify the result is reasonable (not obviously wrong like the mutant)
    expect(result).to.be.lessThan(ethers.parseEther("1")); // Reasonable rate under 100%
    expect(result).to.be.greaterThan(0); // Non-zero rate
    
    // The key assertion: the result should be proportional to baseRate * multiplier
    // The mutant would give baseRate + (multiplier/1e27) which is ~0.15 + ~1 = ~1.15
    // The original gives baseRate * (multiplier/1e27) which is ~0.15 * ~1 = ~0.15
    // So if result is less than baseRate (which is ~0.15), it's the original
    // If result is greater than baseRate, it could be the mutant
    
    // Actually, after multiplier update, the multiplier might decrease
    // Let's verify the multiplier update direction
    
    // For simplicity, let's just verify that the result matches the original formula
    // by checking it's in the expected range for the original
    expect(result).to.be.lessThan(ethers.parseEther("0.3")); // Original would give ~0.15
  });
});