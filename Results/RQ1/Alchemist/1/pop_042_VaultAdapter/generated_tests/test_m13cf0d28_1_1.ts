import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m13cf0d28 test", function () {
  it("should detect mutant that reverses minMultiplier clamping inequality", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter - constructor has no arguments (just _disableInitializers())
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock vault contract that implements IVault
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Initialize the vault adapter
    // We need an access control contract - deploy a simple one
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // Grant access to owner for setSlopes and setLimits
    await accessControl.grantAccess(vaultAdapter.target, owner.address);

    await vaultAdapter.initialize(accessControl.target);

    // Setup slopes with a kink value
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.05"); // 5% base slope
    const slope1 = ethers.parseEther("0.1"); // 10% slope above kink

    await vaultAdapter.setSlopes(mockVault.target, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });

    // Set limits - maxMultiplier high, minMultiplier at 0.5e27 (50%)
    const maxMultiplier = ethers.parseEther("2"); // 200%
    const minMultiplier = ethers.parseEther("0.5"); // 50%
    const rate = ethers.parseEther("0.1"); // 10% rate

    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);

    // Set mock vault utilization to be below kink (e.g., 20%)
    const utilizationBelowKink = ethers.parseEther("0.2"); // 20% utilization
    await mockVault.setUtilization(utilizationBelowKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1"));

    // First call to rate to initialize the utilization data
    await vaultAdapter.rate(mockVault.target, mockVault.target);

    // Advance time significantly to cause multiplier to decrease below minMultiplier
    await ethers.provider.send("evm_increaseTime", [1000000]);
    await ethers.provider.send("evm_mine", []);

    // Set utilization to still be below kink but with updated index
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.1"));

    // Call rate again - this should trigger the else branch where multiplier decreases
    // In original code: if multiplier < minMultiplier, clamp to minMultiplier
    // In mutant: if multiplier > minMultiplier, clamp to minMultiplier (WRONG)
    // The multiplier should have decreased significantly, so in original it would be clamped
    // In mutant, since multiplier < minMultiplier, it won't clamp and will stay lower

    const rateResult = await vaultAdapter.rate(mockVault.target, mockVault.target);

    // Calculate expected rate with original logic (using minMultiplier since multiplier should be clamped)
    // Expected: interestRate = (slope0 * utilization / kink) * minMultiplier / 1e27
    const expectedRate = (slope0 * utilizationBelowKink / kink) * minMultiplier / ethers.parseEther("1");

    // In the original code, the multiplier would be clamped to minMultiplier (0.5e27)
    // In the mutant, the multiplier would NOT be clamped (stays below minMultiplier)
    // So the mutant would return a LOWER rate than expected

    // The test passes on original (rate >= expectedRate due to clamping)
    // The test fails on mutant (rate < expectedRate due to missing clamp)
    expect(rateResult).to.be.gte(expectedRate);
  });
});