import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m6a79450e test", function () {
  it("should detect mutant that changes multiplication to exponentiation in _applySlopes else branch", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock vault for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Initialize the VaultAdapter
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    await vaultAdapter.initialize(await accessControl.getAddress());
    
    // Setup mock access control to allow all calls
    await accessControl.setCheckAccessResult(true);
    
    // Configure slopes for a test asset
    const testAsset = addr1.address;
    const slopes = {
      kink: ethers.parseEther("0.5"), // 50% utilization kink
      slope0: ethers.parseEther("0.05"), // 5% base rate
      slope1: ethers.parseEther("0.1") // 10% slope above kink
    };
    await vaultAdapter.setSlopes(testAsset, slopes);
    
    // Set limits
    await vaultAdapter.setLimits(
      ethers.parseEther("2"),   // maxMultiplier = 2x
      ethers.parseEther("0.5"), // minMultiplier = 0.5x
      ethers.parseEther("0.01") // rate = 1%
    );
    
    // Setup mock vault to return utilization below kink (30%) and a utilization index
    const utilizationBelowKink = ethers.parseEther("0.3"); // 30% utilization
    await mockVault.setUtilization(utilizationBelowKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.0"));
    
    // Get the vault address
    const vaultAddress = await mockVault.getAddress();
    
    // First call to rate to set initial state
    await vaultAdapter.rate(vaultAddress, testAsset);
    
    // Now simulate time passing (elapsed > 1 second) to trigger the else branch calculation
    await ethers.provider.send("evm_increaseTime", [100]); // Increase by 100 seconds
    await ethers.provider.send("evm_mine", []);
    
    // Set a new utilization index to create a delta
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.05"));
    
    // Call rate - this will hit the else branch with _elapsed = 100
    // The original uses multiplication: (1e27 * (kink - util) / kink) * _elapsed
    // The mutant uses exponentiation: (1e27 * (kink - util) / kink) ** _elapsed
    // With elapsed = 100, the mutant will produce astronomically different results
    const rateResult = await vaultAdapter.rate(vaultAddress, testAsset);
    
    // Calculate expected result using original formula:
    // multiplier = multiplier * 1e27 / (1e27 + (1e27 * (kink - util) / kink) * elapsed * rate / 1e27)
    // initial multiplier = 1e27 (since first call)
    // kink = 0.5e18, util = 0.3e18, kink - util = 0.2e18
    // (1e27 * 0.2e18 / 0.5e18) = 4e26
    // 4e26 * 100 * 0.01e18 / 1e27 = 4e26 * 1e18 / 1e27 = 4e17
    // multiplier = 1e27 * 1e27 / (1e27 + 4e17) ≈ 0.9996e27
    // interest = (0.05e18 * 0.3e18 / 0.5e18) * 0.9996e27 / 1e27 = 0.03e18 * 0.9996 ≈ 0.029988e18
    
    // With exponentiation: (4e26) ** 100 = astronomically huge number
    // The multiplier will be essentially 0, and interest rate will be 0
    // So the mutant should return approximately 0, while original returns ~0.029988e18
    
    // Assert that the result is NOT zero (original behavior)
    // If the mutant is present, the result will be approximately 0
    expect(rateResult).to.be.gt(ethers.parseEther("0.01"));
  });
});