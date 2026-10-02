import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m7e36adea detection", function () {
  it("should detect the mutant that changes elapsed calculation from subtraction to addition", async function () {
    const [owner, vault, user] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments needed as it uses _disableInitializers)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock vault contract that returns utilization data
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Initialize the vault adapter
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    await vaultAdapter.initialize(await accessControl.getAddress());

    // Set slopes for an asset to enable rate calculation
    const asset = await ethers.Wallet.createRandom().getAddress();
    const slopes = {
      kink: ethers.parseEther("0.8"), // 80% utilization kink
      slope0: ethers.parseEther("0.05"), // 5% base rate
      slope1: ethers.parseEther("0.5") // 50% slope above kink
    };

    // Grant access to set slopes
    const setSlopesSelector = ethers.id("setSlopes(address,(uint256,uint256,uint256))").substring(0, 10);
    await accessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);

    await vaultAdapter.connect(owner).setSlopes(asset, slopes);

    // Set limits
    const setLimitsSelector = ethers.id("setLimits(uint256,uint256,uint256)").substring(0, 10);
    await accessControl.grantAccess(setLimitsSelector, await vaultAdapter.getAddress(), owner.address);

    await vaultAdapter.connect(owner).setLimits(
      ethers.parseEther("2"),   // maxMultiplier = 2x
      ethers.parseEther("0.5"), // minMultiplier = 0.5x
      ethers.parseEther("0.1")  // rate = 10%
    );

    // First call to rate to set initial state
    const vaultAddress = await mockVault.getAddress();

    // Set mock vault to return a specific utilization index
    const initialTimestamp = await ethers.provider.getBlock("latest").then(b => b!.timestamp);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("0.6")); // 60% utilization index
    await mockVault.setUtilization(ethers.parseEther("0.6")); // 60% utilization

    // First call - should succeed
    await vaultAdapter.rate(vaultAddress, asset);

    // Advance time by 100 seconds
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);

    // Update mock vault to return a slightly different utilization index
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("0.65")); // 65% utilization index
    await mockVault.setUtilization(ethers.parseEther("0.65")); // 65% utilization

    // Second call - in the original, elapsed = block.timestamp - lastUpdate = ~100
    // In the mutant, elapsed = block.timestamp + lastUpdate = very large number
    const result = await vaultAdapter.rate(vaultAddress, asset);

    // The original should return a reasonable rate (around 0.05 * 1.0 / 1e27 range)
    // The mutant would produce an astronomically large number due to elapsed being sum of timestamps
    // We expect the rate to be less than 1e27 (a reasonable bound for interest rates)
    expect(result).to.be.lessThan(ethers.parseEther("100")); // Reasonable max rate
  });
});