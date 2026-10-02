import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant mb4f3e800 test", function () {
  it("should detect mutant that replaces block.timestamp > utilizationData.lastUpdate with false", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock vault to test rate function
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Deploy AccessControl contract for initialization
    const AccessControlFactory = await ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // Grant access to the owner for all selectors
    await accessControl.grantAccess(ethers.id("setSlopes(bytes4,address,address)"), await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(ethers.id("setLimits(uint256,uint256,uint256)"), await vaultAdapter.getAddress(), owner.address);

    // Initialize the vault adapter
    await vaultAdapter.initialize(await accessControl.getAddress());

    // Set slopes for a test asset
    const testAsset = addr1.address;
    const slopes = {
      kink: ethers.parseEther("0.5"),
      slope0: ethers.parseEther("0.05"),
      slope1: ethers.parseEther("0.1")
    };

    await vaultAdapter.setSlopes(testAsset, slopes);

    // Set limits
    await vaultAdapter.setLimits(
      ethers.parseEther("2"),
      ethers.parseEther("0.5"),
      ethers.parseEther("0.1")
    );

    // Get initial rate - this will set lastUpdate to current block.timestamp
    const vaultAddress = await mockVault.getAddress();
    await vaultAdapter.rate(vaultAddress, testAsset);

    // Fast forward time by 100 seconds to simulate elapsed time
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);

    // Get rate again - should use index-based calculation with elapsed time
    const rate1 = await vaultAdapter.rate(vaultAddress, testAsset);

    // Fast forward time again
    await ethers.provider.send("evm_increaseTime", [200]);
    await ethers.provider.send("evm_mine", []);

    // Get rate a third time
    const rate2 = await vaultAdapter.rate(vaultAddress, testAsset);

    // Get rate a fourth time
    const rate3 = await vaultAdapter.rate(vaultAddress, testAsset);

    // Verify that rates change over time as utilization updates
    expect(rate1).to.not.equal(rate2, "Rate should change over time as utilization updates");
    expect(rate2).to.not.equal(rate3, "Rate should continue to change with additional elapsed time");
  });
});