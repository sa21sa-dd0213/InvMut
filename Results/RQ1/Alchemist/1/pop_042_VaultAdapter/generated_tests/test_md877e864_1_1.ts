import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant md877e864 test", function () {
  it("should detect the mutant that changes subtraction to division in rate calculation", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock vault contract that returns specific utilization index values
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Initialize VaultAdapter
    const AccessControlFactory = await ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    await instance.initialize(await accessControl.getAddress());

    // Grant access to the setSlopes and setLimits functions for the owner
    await accessControl.grantAccess(instance.setSlopes.selector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(instance.setLimits.selector, await instance.getAddress(), owner.address);

    // Set up slopes for an asset
    const assetAddress = ethers.Wallet.createRandom().address;
    await instance.setSlopes(assetAddress, {
      kink: ethers.parseEther("0.8"), // 80% utilization
      slope0: ethers.parseEther("0.05"), // 5% base rate
      slope1: ethers.parseEther("0.5") // 50% slope above kink
    });

    // Set limits
    await instance.setLimits(
      ethers.parseEther("2"), // maxMultiplier
      ethers.parseEther("0.5"), // minMultiplier
      ethers.parseEther("0.1") // rate
    );

    // Configure mock vault to return specific utilization index values
    const vaultAddress = await mockVault.getAddress();
    const initialIndex = ethers.parseEther("1.0"); // 1e18
    const updatedIndex = ethers.parseEther("1.5"); // 1.5e18 (increase of 0.5e18)

    await mockVault.setCurrentUtilizationIndex(assetAddress, initialIndex);
    await mockVault.setUtilization(assetAddress, ethers.parseEther("0.5")); // 50% utilization

    // First call to rate to set initial state
    await instance.rate(vaultAddress, assetAddress);

    // Advance time by 1 second
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Update mock vault to return new index
    await mockVault.setCurrentUtilizationIndex(assetAddress, updatedIndex);
    await mockVault.setUtilization(assetAddress, ethers.parseEther("0.6")); // 60% utilization

    // Call rate again - this should trigger the index calculation branch
    const result = await instance.rate(vaultAddress, assetAddress);

    // Calculate expected result using original formula: (index - utilizationData.index) / elapsed
    // Expected utilization = (1.5e18 - 1.0e18) / 1 = 0.5e18
    // The mutant would compute: (1.5e18 / 1.0e18) / 1 = 1.5e18
    // These are different values, so the mutant would produce a different result

    // Since utilization (0.5e18) < kink (0.8e18), we use the else branch
    // Expected multiplier calculation with original code:
    // utilizationData.multiplier = 1.0 * 1e27 / (1e27 + (1e27 * (0.8e18 - 0.5e18) / 0.8e18) * 1 * 0.1e18 / 1e27)
    // = 1e27 / (1e27 + (1e27 * 0.3e18 / 0.8e18) * 0.1e18 / 1e27)
    // = 1e27 / (1e27 + (0.375e27) * 0.1e18 / 1e27)
    // = 1e27 / (1e27 + 0.0375e18)
    // ≈ 0.9999999999999999999625e27 (very close to 1e27)

    // Expected interest rate = (slope0 * utilization / kink) * multiplier / 1e27
    // = (0.05e18 * 0.5e18 / 0.8e18) * ~1e27 / 1e27
    // = 0.03125e18 = 3.125%

    // For the mutant, utilization would be 1.5e18 (above kink of 0.8e18)
    // This would enter the if branch instead of else branch, producing completely different result

    // The key observation: the mutant changes which branch is taken
    // With original: utilization = 0.5e18 < kink -> else branch
    // With mutant: utilization = 1.5e18 > kink -> if branch

    // Therefore, if we can show the result matches the else branch calculation
    // and not the if branch, we detect the mutant
    const expectedResultWithElse = ethers.parseEther("0.03125"); // ~3.125%
    const expectedResultWithIf = ethers.parseEther("0.5"); // Would be much larger

    // The result should be close to the else branch calculation
    expect(result).to.be.closeTo(expectedResultWithElse, ethers.parseEther("0.001"));

    // Verify it's NOT the if branch result
    expect(result).to.not.be.closeTo(expectedResultWithIf, ethers.parseEther("0.1"));
  });
});