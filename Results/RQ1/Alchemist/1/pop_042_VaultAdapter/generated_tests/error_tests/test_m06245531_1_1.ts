import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m06245531 detection", function () {
  it("should detect the arithmetic mutation in _applySlopes when utilization is below kink and product is less than 1e27", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock vault for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Setup: initialize the adapter and set slopes with a kink value
    const accessControlAddr = await setupAccessControl(owner, instance);
    await instance.initialize(accessControlAddr);

    // Set slopes with a reasonable kink (e.g., 0.5e27 = 50% utilization kink)
    const kink = ethers.parseEther("0.5"); // 0.5e18, but we need 1e27 precision
    const slope0 = ethers.parseEther("0.1"); // 0.1 * 1e18
    const slope1 = ethers.parseEther("0.2"); // 0.2 * 1e18
    await instance.connect(owner).setSlopes(await mockVault.getAddress(), { 
      kink: kink * 10n**9n, 
      slope0: slope0 * 10n**9n, 
      slope1: slope1 * 10n**9n 
    });

    // Set limits with small multiplier to ensure product is less than 1e27
    await instance.connect(owner).setLimits(
      ethers.parseEther("1"),    // maxMultiplier = 1e18
      ethers.parseEther("0.01"), // minMultiplier = 0.01e18
      ethers.parseEther("0.1")   // rate = 0.1e18
    );

    // Set up vault mock to return low utilization (below kink)
    // We need utilization < kink to trigger the else branch
    const lowUtilization = ethers.parseEther("0.1"); // 10% utilization
    await mockVault.setUtilization(lowUtilization);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1")); // index = 1e18

    // Call rate() which triggers _applySlopes with utilization below kink
    // The product (slope0 * utilization / kink) * multiplier will be small
    // Expected: (0.1e27 * 0.1e27 / 0.5e27) * 1e18 / 1e27 = (0.02e27) * 1e18 / 1e27 = 0.02e18
    // This is much less than 1e27, so original returns ~0.02e18, mutant would revert or return negative

    // In the mutant, it would compute: product - 1e27, which underflows since product < 1e27
    await expect(
      instance.rate(await mockVault.getAddress(), await mockVault.getAddress())
    ).to.not.be.reverted;

    // Verify the returned value is reasonable (positive and small)
    const result = await instance.rate(await mockVault.getAddress(), await mockVault.getAddress());
    expect(result).to.be.gt(0);
    expect(result).to.be.lt(ethers.parseEther("1")); // Should be small positive number
  });
});

// Helper to deploy access control
async function setupAccessControl(owner: any, vaultAdapter: any): Promise<string> {
  const AccessControlFactory = await ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControlFactory.deploy();
  await accessControl.waitForDeployment();

  // Grant access to owner for all functions on vaultAdapter
  await accessControl.initialize(owner.address);
  await accessControl.connect(owner).grantAccess("0x00000000", await vaultAdapter.getAddress(), owner.address);

  return await accessControl.getAddress();
}