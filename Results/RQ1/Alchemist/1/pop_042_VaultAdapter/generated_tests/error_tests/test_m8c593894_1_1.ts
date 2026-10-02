import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m8c593894 - block.timestamp vs block.prevrandao", function () {
  it("should detect mutant by calling rate() when elapsed equals block.timestamp", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy VaultAdapter
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock vault to test with
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Initialize VaultAdapter
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    await vaultAdapter.initialize(await accessControl.getAddress());

    // Set slopes for the asset
    const assetAddress = ethers.Wallet.createRandom().address;
    const slopes = {
      kink: ethers.parseEther("0.5"), // 0.5 * 1e18
      slope0: ethers.parseEther("0.1"),
      slope1: ethers.parseEther("0.2")
    };

    // Grant access to set slopes
    const setSlopesSelector = vaultAdapter.interface.getFunction("setSlopes").selector;
    await accessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);

    await vaultAdapter.setSlopes(assetAddress, slopes);

    // First call to rate() to set lastUpdate and index
    await vaultAdapter.rate(await mockVault.getAddress(), assetAddress);

    // Wait for next block (elapsed > 0 but not equal to block.timestamp)
    await ethers.provider.send("evm_mine", []);

    // Call rate() again - in original code, if elapsed != block.timestamp it will use the index-based calculation
    // In the mutant, it checks elapsed != block.prevrandao
    await vaultAdapter.rate(await mockVault.getAddress(), assetAddress);

    // Call rate() again in the same block (no mining between calls) to test elapsed == 0
    const result2 = await vaultAdapter.rate(await mockVault.getAddress(), assetAddress);

    // Get utilization from mock vault
    const utilization = await mockVault.utilization(assetAddress);

    // The key scenario: when elapsed == 0 and block.prevrandao == 0
    // Original: if (0 != block.timestamp) -> true -> uses index calculation
    // Mutant: if (0 != 0) -> false -> uses utilization
    // When elapsed == 0, the original calculates utilization = (index - index) / 0 = 0
    // Then applies slopes with utilization = 0
    // In the mutant, it uses IVault.utilization() which returns actual utilization > 0
    // So the results should be different if mutant is active

    // Re-run the same-block scenario to ensure we detect the mutant
    await vaultAdapter.rate(await mockVault.getAddress(), assetAddress);
    const resultMutant = await vaultAdapter.rate(await mockVault.getAddress(), assetAddress);

    // For the original code: when elapsed == 0, the calculation gives utilization = 0
    // Then _applySlopes with utilization = 0 will use the else branch
    // The result should be 0 because slope0 * 0 / kink = 0
    expect(resultMutant).to.equal(0);
    
    // Additional verification: the result should be different from what utilization-based calculation would give
    expect(resultMutant).to.not.equal(utilization);
  });
});