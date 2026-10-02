import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant detection - _applySlopes subtraction replaced with addition", function () {
  it("should detect mutant by verifying higher interest rate when utilization exceeds kink", async function () {
    const [owner, vault, user] = await ethers.getSigners();

    // Deploy VaultAdapter (constructor takes no arguments as per contract)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const adapter = await VaultAdapterFactory.deploy();
    await adapter.waitForDeployment();

    // Deploy a minimal mock vault that returns utilization data
    // We need a contract that implements IVault.currentUtilizationIndex and IVault.utilization
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Initialize the adapter
    await adapter.initialize(owner.address);

    // Set slopes - use a kink value that's reasonable (e.g., 0.8e27 = 80%)
    const kink = ethers.parseEther("0.8"); // 0.8 * 1e18 but we need 1e27 scale
    const slope0 = ethers.parseEther("0.05"); // 5% base rate
    const slope1 = ethers.parseEther("0.5"); // 50% slope above kink
    await adapter.setSlopes(await mockVault.getAddress(), {
      kink: kink * BigInt(1e9), // Convert to 1e27 scale
      slope0: slope0 * BigInt(1e9),
      slope1: slope1 * BigInt(1e9)
    });

    // Set limits - allow high multipliers
    await adapter.setLimits(
      ethers.parseEther("10") * BigInt(1e9), // maxMultiplier = 10x
      ethers.parseEther("0.5") * BigInt(1e9), // minMultiplier = 0.5x
      ethers.parseEther("0.1") * BigInt(1e9)  // rate = 0.1
    );

    // Set up vault state for utilization above kink (e.g., 90% utilization)
    const utilizationAboveKink = BigInt(9) * BigInt(1e26); // 0.9 * 1e27
    await mockVault.setUtilization(utilizationAboveKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1000") * BigInt(1e9));

    // Set lastUpdate to some time ago so elapsed > 0
    // We need to manipulate storage or use a different approach
    // Instead, call rate() which will update the state

    // First call to rate() to set initial state
    await adapter.rate(await mockVault.getAddress(), await mockVault.getAddress());

    // Advance time by 1 hour (3600 seconds)
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    // Set a new utilization index to simulate interest accrual
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1100") * BigInt(1e9));

    // Now call rate() again - this will trigger the _applySlopes logic
    const interestRate = await adapter.rate(await mockVault.getAddress(), await mockVault.getAddress());

    // For utilization above kink, the expected behavior:
    // - Original formula: multiplier increases due to (1e27 - kink) denominator
    // - Mutant formula: multiplier decreases due to (1e27 + kink) denominator
    // Therefore original should give HIGHER rate than mutant

    // Calculate expected rate manually for original formula
    // With kink = 0.8e27, utilization = 0.9e27, excess = 0.1e27
    // Original denominator: 1e27 - 0.8e27 = 0.2e27
    // Mutant denominator: 1e27 + 0.8e27 = 1.8e27
    // The original should produce ~9x higher multiplier component

    // Verify the rate is reasonably high (original behavior)
    // Original would give: slope0 + slope1 * excess / 1e27 = 0.05 + 0.5 * 0.1 = 0.1
    // Multiplier increase: 1e27 * excess / (1e27 - kink) = 1e27 * 0.1 / 0.2 = 0.5e27
    // This is a significant multiplier increase

    expect(interestRate).to.be.gt(ethers.parseEther("0.05") * BigInt(1e9)); // Should be above base rate

    // The key assertion: rate should be significantly higher than if the mutant were active
    // Mutant would give much lower rate due to larger denominator
    // We can verify this by checking that rate is at least 2x what mutant would produce

    // Calculate what mutant would produce:
    // Multiplier component: 1e27 * 0.1 / 1.8 = ~0.0556e27 (much smaller)
    // This would result in interest rate ~0.1056 * original multiplier effect

    // Since we can't directly calculate, assert the rate is meaningfully high
    // Original formula should produce rate > 0.08e27 (8% annualized)
    expect(interestRate).to.be.gt(ethers.parseEther("0.08") * BigInt(1e9));
  });
});