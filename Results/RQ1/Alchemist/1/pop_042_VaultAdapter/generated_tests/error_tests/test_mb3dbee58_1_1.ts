import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant mb3dbee58 test", function () {
  it("should detect the mutant that replaces / with + in _applySlopes when utilization exceeds kink", async function () {
    const [owner, vault, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments as per code)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock vault to return utilization data
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Setup access control
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // Initialize VaultAdapter
    await instance.initialize(await accessControl.getAddress());

    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = instance.interface.getFunction("setSlopes").selector;
    const setLimitsSelector = instance.interface.getFunction("setLimits").selector;
    await accessControl.grantAccess(setSlopesSelector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(setLimitsSelector, await instance.getAddress(), owner.address);

    // Configure slopes with kink at 50% (0.5e27)
    const kink = ethers.parseEther("0.5");
    const slope0 = ethers.parseEther("0.05");  // 5%
    const slope1 = ethers.parseEther("0.1");   // 10%
    await instance.setSlopes(await mockVault.getAddress(), { kink, slope0, slope1 });

    // Set limits
    const maxMultiplier = ethers.parseEther("2");  // 2x
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x
    const rate = ethers.parseEther("0.1"); // 10% rate
    await instance.setLimits(maxMultiplier, minMultiplier, rate);

    // Configure mock vault to return utilization above kink (80% = 0.8e27)
    const utilizationAboveKink = ethers.parseEther("0.8");
    await mockVault.setUtilization(utilizationAboveKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("100"));

    // Fast forward time to create elapsed time
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);

    // Call rate() - this will trigger _applySlopes with utilization > kink
    const result = await instance.rate(await mockVault.getAddress(), await mockVault.getAddress());

    // Calculate expected max interest rate:
    // With maxMultiplier = 2e27 and slopes.slope0 + slopes.slope1 * excess / 1e27
    // Max possible = (0.05e27 + 0.1e27 * 0.3e27 / 1e27) * 2e27 / 1e27 = 0.08e27 * 2 = 0.16e27
    const maxExpectedRate = ethers.parseEther("0.16");

    // The mutant would produce a much larger value due to the addition instead of division
    // Assert that result is within reasonable bounds (should fail on mutant)
    expect(result).to.be.lte(maxExpectedRate);

    // Also verify it's non-zero (basic sanity)
    expect(result).to.be.gt(0);
  });
});