import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant mde77dd0a - kill by division replaced with subtraction", function () {
  it("should kill mutant by checking correct interest rate calculation when utilization exceeds kink", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock vault contract that implements IVault
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Initialize VaultAdapter
    await instance.initialize(owner.address);

    // Set slopes for an asset
    const asset = addr1.address;
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.1"); // 10% base slope
    const slope1 = ethers.parseEther("2"); // 200% slope above kink
    await instance.setSlopes(asset, { kink, slope0, slope1 });

    // Set limits
    const maxMultiplier = ethers.parseEther("5"); // 5x max multiplier
    const minMultiplier = ethers.parseEther("0.2"); // 0.2x min multiplier
    const rate = ethers.parseEther("0.1"); // 10% rate parameter
    await instance.setLimits(maxMultiplier, minMultiplier, rate);

    // Setup: Set utilization above kink (e.g., 80%) and index values
    // We need to call rate() which reads from the vault contract
    // The vault must return utilization > kink and have proper index values
    await mockVault.setUtilization(ethers.parseEther("0.8")); // 80% utilization
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.5")); // index 1.5

    // First call to rate to set initial state
    await instance.rate(await mockVault.getAddress(), asset);

    // Now advance time to have elapsed > 0
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);

    // Set new index to simulate growth
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.8"));

    // Call rate - this triggers _applySlopes with utilization > kink
    // Original: multiplier * (1e27 + (1e27 * excess / (1e27 - kink)) * elapsed * rate / 1e27) / 1e27
    // Mutant:   multiplier * (1e27 + (1e27 * excess - (1e27 - kink)) * elapsed * rate / 1e27) / 1e27
    // With excess = 0.3e27, kink = 0.5e27, elapsed = 3600, rate = 0.1e27
    // Original intermediate: (1e27 * 0.3e27 / (1e27 - 0.5e27)) = 0.3e54 / 0.5e27 = 0.6e27
    // Mutant intermediate:   (1e27 * 0.3e27 - (1e27 - 0.5e27)) = 0.3e54 - 0.5e27 = massive difference

    const result = await instance.rate(await mockVault.getAddress(), asset);

    // Calculate expected result using original formula
    const excess = ethers.parseEther("0.3"); // 0.8 - 0.5 = 0.3
    const oneE27 = ethers.parseEther("1000000000000000000"); // 1e27
    const denominator = oneE27 - kink; // 0.5e27
    const originalTerm = (oneE27 * excess / denominator) * BigInt(3600) * rate / oneE27;
    const originalMultiplier = oneE27 + originalTerm;

    // Mutant would produce: oneE27 * excess - denominator = 0.3e54 - 0.5e27 (absurd)
    // So the result will be completely different

    // Assert the result is within expected range (not the absurd mutant value)
    expect(result).to.be.gt(0);
    expect(result).to.be.lt(ethers.parseEther("100")); // Sanity check - mutant would overflow or produce huge number

    // More precise: check that result matches expected original calculation
    const expectedBase = slope0 + (slope1 * excess / oneE27);
    const expectedRate = expectedBase * originalMultiplier / oneE27;
    // Allow some rounding tolerance
    expect(result).to.be.closeTo(expectedRate, ethers.parseEther("0.001"));
  });
});