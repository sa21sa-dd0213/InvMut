import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant mf1c52b08 test", function () {
  it("should kill mutant by verifying correct interest rate calculation when utilization is below kink", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy VaultAdapter (constructor has no arguments as it only calls _disableInitializers())
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock vault for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy access control
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize the VaultAdapter
    await instance.initialize(await accessControl.getAddress());
    
    // Grant access to the owner for setSlopes and setLimits
    const setSlopesSelector = instance.interface.getFunction("setSlopes").selector;
    const setLimitsSelector = instance.interface.getFunction("setLimits").selector;
    const rateSelector = instance.interface.getFunction("rate").selector;
    await accessControl.grantAccess(setSlopesSelector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(setLimitsSelector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(rateSelector, await instance.getAddress(), owner.address);
    
    // Set up slopes with specific values
    const testAsset = ethers.Wallet.createRandom().address;
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.1"); // 10% base slope
    const slope1 = ethers.parseEther("0.2"); // 20% slope above kink
    
    await instance.setSlopes(testAsset, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2"); // 2x max multiplier
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x min multiplier
    const rate = ethers.parseEther("0.1"); // 10% rate parameter
    
    await instance.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Configure mock vault to return utilization below kink (e.g., 30%)
    const utilizationBelowKink = ethers.parseEther("0.3"); // 30% utilization
    await mockVault.setUtilization(testAsset, utilizationBelowKink);
    await mockVault.setCurrentUtilizationIndex(testAsset, ethers.parseEther("1"));
    
    // Call rate function which will trigger _applySlopes with utilization below kink
    // The original formula: multiplier = multiplier * 1e27 / (1e27 + (1e27 * (kink - utilization) / kink) * elapsed * rate / 1e27)
    // The mutant formula:  multiplier = multiplier * 1e27 / (1e27 * (1e27 * (kink - utilization) / kink) * elapsed * rate / 1e27)
    
    // For the first call, multiplier starts at 1e27 (1.0 in fixed point)
    // Original denominator: 1e27 + (1e27 * (0.5 - 0.3) / 0.5) * 0 * rate / 1e27 = 1e27 + 0 = 1e27
    // Mutant denominator: 1e27 * (1e27 * (0.5 - 0.3) / 0.5) * 0 * rate / 1e27 = 0
    // If elapsed is 0, the original gives multiplier = 1e27 * 1e27 / 1e27 = 1e27
    // The mutant would revert due to division by zero
    
    // To avoid division by zero, we need elapsed > 0, so call rate twice
    // First call updates lastUpdate to current block.timestamp
    await instance.rate(await mockVault.getAddress(), testAsset);
    
    // Increase time to have elapsed > 0
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Second call: now elapsed = 3600 seconds
    // Original: multiplier = 1e27 * 1e27 / (1e27 + (1e27 * (0.5 - 0.3) / 0.5) * 3600 * 0.1e27 / 1e27)
    // = 1e54 / (1e27 + (1e27 * 0.2 / 0.5) * 3600 * 0.1 / 1)
    // = 1e54 / (1e27 + (0.4e27) * 3600 * 0.1)
    // = 1e54 / (1e27 + 144e27)
    // = 1e54 / 145e27
    // = ~0.00689655e27
    
    // Mutant: multiplier = 1e27 * 1e27 / (1e27 * (1e27 * (0.5 - 0.3) / 0.5) * 3600 * 0.1e27 / 1e27)
    // = 1e54 / (1e27 * (0.4e27) * 3600 * 0.1)
    // = 1e54 / (1e27 * 144e27)
    // = 1e54 / 144e54
    // = ~0.00694444e27
    
    const result = await instance.rate(await mockVault.getAddress(), testAsset);
    
    // Calculate expected result for original formula
    // Interest rate = (slope0 * utilization / kink) * multiplier / 1e27
    // = (0.1e27 * 0.3e27 / 0.5e27) * 0.00689655e27 / 1e27
    // = 0.06e27 * 0.00689655
    // = ~0.00041379e27
    
    const expectedMultiplier = ethers.parseEther("0.00689655");
    const expectedInterestRate = (slope0 * utilizationBelowKink / kink) * expectedMultiplier / ethers.parseEther("1");
    
    // The mutant produces a different result, so if the test passes with the original
    // it should fail with the mutant
    expect(result).to.equal(expectedInterestRate);
  });
});