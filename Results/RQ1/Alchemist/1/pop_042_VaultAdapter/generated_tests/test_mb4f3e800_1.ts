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
    // We need a contract that implements IVault interface
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Initialize VaultAdapter
    // First deploy an AccessControl contract for initialization
    const AccessControlFactory = await ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Grant access to the owner for all selectors
    await accessControl.grantAccess(ethers.id("setSlopes(bytes4,address,address)"), await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(ethers.id("setLimits(uint256,uint256,uint256)"), await vaultAdapter.getAddress(), owner.address);
    
    // Initialize the vault adapter
    await vaultAdapter.initialize(await accessControl.getAddress());
    
    // Set slopes for a test asset
    const testAsset = addr1.address; // Use addr1 as a mock asset address
    const slopes = {
      kink: ethers.parseEther("0.5"), // 50% utilization kink
      slope0: ethers.parseEther("0.05"), // 5% base rate
      slope1: ethers.parseEther("0.1") // 10% slope above kink
    };
    
    await vaultAdapter.setSlopes(testAsset, slopes);
    
    // Set limits
    await vaultAdapter.setLimits(
      ethers.parseEther("2"), // maxMultiplier = 2
      ethers.parseEther("0.5"), // minMultiplier = 0.5
      ethers.parseEther("0.1") // rate = 10%
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
    
    // In the original contract, rate should change over time as utilization index updates
    // In the mutant (block.timestamp > lastUpdate replaced with false), rate will always be the same
    // because it always uses the static utilization value from the vault
    // Since utilization is constant in our mock vault, the mutant would return same value every time
    // The original would update utilization data and return different rates based on elapsed time
    
    // To kill the mutant, we need to verify that the rate calculation actually used elapsed time
    // We can check that the utilizationData was updated by calling rate again and comparing
    const rate3 = await vaultAdapter.rate(vaultAddress, testAsset);
    
    // In the original, rate3 should differ from rate2 because more time elapsed
    // In the mutant, all rates will be identical since it always falls through to else branch
    expect(rate1).to.not.equal(rate2, "Rate should change over time as utilization updates");
    expect(rate2).to.not.equal(rate3, "Rate should continue to change with additional elapsed time");
  });
});