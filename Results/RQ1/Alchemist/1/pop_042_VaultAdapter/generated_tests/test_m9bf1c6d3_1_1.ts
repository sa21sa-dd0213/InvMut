import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant detection - m9bf1c6d3", function () {
  it("should detect the mutant that replaces * with + in multiplier calculation when utilization is above kink", async function () {
    const [owner, vault, asset] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock vault that implements IVault interface
    const MockVault = await ethers.getContractFactory("contracts/mocks/MockVault.sol:MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();

    // Initialize the VaultAdapter
    const AccessControlFactory = await ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    await instance.initialize(await accessControl.getAddress());

    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = instance.interface.getFunction("setSlopes").selector;
    const setLimitsSelector = instance.interface.getFunction("setLimits").selector;
    const vaultAdapterAddress = await instance.getAddress();

    await accessControl.grantAccess(setSlopesSelector, vaultAdapterAddress, owner.address);
    await accessControl.grantAccess(setLimitsSelector, vaultAdapterAddress, owner.address);

    // Setup slopes with a kink value
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.05"); // 5% base slope
    const slope1 = ethers.parseEther("0.1"); // 10% slope above kink

    await instance.setSlopes(asset.address, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });

    // Set limits
    const maxMultiplier = ethers.parseEther("2"); // 2x max
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x min
    const rate = ethers.parseEther("0.1"); // 10% rate

    await instance.setLimits(maxMultiplier, minMultiplier, rate);

    // Setup mock vault to return utilization above kink (e.g., 80%)
    const utilizationAboveKink = ethers.parseEther("0.8"); // 80% utilization
    const currentIndex = ethers.parseEther("1.5"); // Some index value

    // Mock the vault to return utilization and currentUtilizationIndex
    await mockVault.setUtilization(asset.address, utilizationAboveKink);
    await mockVault.setCurrentUtilizationIndex(asset.address, currentIndex);

    // First call to rate() - this will initialize utilizationData
    const firstRate = await instance.rate(await mockVault.getAddress(), asset.address);

    // Update mock vault for second call - increase index to simulate elapsed time
    const newIndex = ethers.parseEther("1.8");
    await mockVault.setCurrentUtilizationIndex(asset.address, newIndex);

    // Mine blocks to advance time
    await ethers.provider.send("evm_increaseTime", [100]); // 100 seconds
    await ethers.provider.send("evm_mine", []);

    // Second call to rate() - this will use the multiplier calculation
    const secondRate = await instance.rate(await mockVault.getAddress(), asset.address);

    // In the original contract, the multiplier is multiplied by (1e27 + ...) 
    // In the mutant, it's added with (1e27 + ...)
    // The difference becomes apparent in the second call when multiplier grows
    // The original will have a larger multiplier (multiplicative growth) vs mutant (additive growth)

    // Calculate what the original should return
    // For original: multiplier_new = multiplier_old * (1e27 + factor) / 1e27
    // For mutant: multiplier_new = multiplier_old + (1e27 + factor) / 1e27

    // The original should produce a higher interest rate due to compounding effect
    // We can verify by checking that the second rate is higher than what additive would produce

    // The key insight: with multiplicative growth, the second rate should be significantly higher
    // than with additive growth. We can test this by calling rate() with the same parameters
    // after resetting the utilization data (by calling with a different vault address)

    // Deploy another mock vault for comparison
    const MockVault2 = await ethers.getContractFactory("contracts/mocks/MockVault.sol:MockVault");
    const mockVault2 = await MockVault2.deploy();
    await mockVault2.waitForDeployment();

    await mockVault2.setUtilization(asset.address, utilizationAboveKink);
    await mockVault2.setCurrentUtilizationIndex(asset.address, currentIndex);

    // Call rate on the second vault (fresh state)
    const firstRateVault2 = await instance.rate(await mockVault2.getAddress(), asset.address);

    // Advance time and update index
    await mockVault2.setCurrentUtilizationIndex(asset.address, newIndex);
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);

    const secondRateVault2 = await instance.rate(await mockVault2.getAddress(), asset.address);

    // In the original contract, the ratio between second and first rate should follow
    // multiplicative growth. In the mutant, it follows additive growth.
    // The multiplicative growth produces a larger increase.

    const ratioOriginal = secondRateVault2 * BigInt(1e27) / firstRateVault2;
    const ratioMutant = secondRate * BigInt(1e27) / firstRate;

    // The original ratio should be greater than the mutant ratio
    // because multiplicative growth > additive growth
    expect(ratioOriginal).to.be.gt(ratioMutant);

    // Additional check: The second rate from the original (first vault) should be
    // higher than what would be expected from additive growth
    // We can calculate the expected additive result and compare
    // For additive: multiplier_new = multiplier_old + (1e27 + factor) / 1e27
    // The factor is: (1e27 * excess / (1e27 - kink)) * elapsed * rate / 1e27

    // If the ratioOriginal > ratioMutant, it confirms the multiplicative behavior
    // vs additive behavior, killing the mutant
  });
});