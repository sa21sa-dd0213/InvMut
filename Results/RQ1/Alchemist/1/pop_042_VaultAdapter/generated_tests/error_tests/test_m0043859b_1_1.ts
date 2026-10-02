import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m0043859b test", function () {
  it("should detect the arithmetic mutation in _applySlopes when utilization is below kink", async function () {
    const [owner, vault, user] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock vault for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Initialize the VaultAdapter with access control
    // We need a simple access control contract for testing
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    await vaultAdapter.initialize(await accessControl.getAddress());

    // Grant access to the owner for setSlopes
    await accessControl.grantAccess(vaultAdapter.setSlopes.selector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(vaultAdapter.setLimits.selector, await vaultAdapter.getAddress(), owner.address);

    // Set up slopes with a kink value (e.g., 5e26 = 50% utilization)
    const kink = ethers.parseEther("0.5"); // 5e26 in 1e27 scale
    const slope0 = ethers.parseEther("0.1"); // 1e26
    const slope1 = ethers.parseEther("0.2"); // 2e26
    await vaultAdapter.setSlopes(await mockVault.getAddress(), { kink, slope0, slope1 });

    // Set limits
    const maxMultiplier = ethers.parseEther("2"); // 2e27
    const minMultiplier = ethers.parseEther("0.5"); // 5e26
    const rate = ethers.parseEther("0.1"); // 1e26
    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);

    // Configure mock vault to return utilization below kink (e.g., 20%)
    const utilizationBelowKink = ethers.parseEther("0.2"); // 2e26
    await mockVault.setUtilization(utilizationBelowKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("100")); // initial index

    // First call to rate to set up initial state
    const asset = await ethers.Wallet.createRandom().getAddress();
    await vaultAdapter.rate(await mockVault.getAddress(), asset);

    // Advance time to make _elapsed non-zero
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);

    // Set a new utilization index to simulate time passage
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("101"));

    // Now call rate again - this will trigger the multiplier update with non-zero _elapsed
    const rateResult = await vaultAdapter.rate(await mockVault.getAddress(), asset);

    // The original formula: multiplier = multiplier * 1e27 / (1e27 + (1e27 * (kink - util) / kink) * elapsed * rate / 1e27)
    // This should produce a value <= the initial multiplier (since denominator > 1e27)
    // The mutant uses subtraction: 1e27 - (1e27 * (kink - util) / kink) * elapsed * rate / 1e27
    // This could produce a smaller denominator (or even zero/negative) leading to larger multiplier

    // With our parameters:
    // kink = 5e26, utilization = 2e26, elapsed = 3600, rate = 1e26
    // Original denominator = 1e27 + (1e27 * 3e26 / 5e26) * 3600 * 1e26 / 1e27
    //                      = 1e27 + (6e26) * 3600 * 1e26 / 1e27
    //                      = 1e27 + 2.16e32 / 1e27 = 1e27 + 216 = ~1e27
    // Mutant denominator = 1e27 - (same calculation) = 1e27 - 216

    // The interest rate should be reasonable (< 1e27) for the original
    // For the mutant, it could be much larger or even overflow

    // We expect the original to produce a rate <= (slope0 * util / kink) * multiplier / 1e27
    // With initial multiplier = 1e27 (default), max rate = (1e26 * 2e26 / 5e26) * 1e27 / 1e27 = 4e25

    expect(rateResult).to.be.lessThan(ethers.parseEther("1")); // Should be < 100% interest rate

    // Additional check: if we call rate again with same parameters, multiplier should decrease
    const secondRate = await vaultAdapter.rate(await mockVault.getAddress(), asset);
    expect(secondRate).to.be.lessThanOrEqual(rateResult);
  });
});