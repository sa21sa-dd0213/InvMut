import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant test - m0353786f", function () {
  it("should detect mutant that replaces division with addition in rate calculation", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy VaultAdapter (constructor takes no arguments, but calls _disableInitializers)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock vault for testing - we need a contract that implements IVault
    // For this test, we'll deploy a simple contract that returns known values
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Initialize the vault adapter
    // First we need to deploy an access control contract
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Grant access to the owner for all functions
    await accessControl.grantAccess(ethers.id("initialize(address)"), await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(ethers.id("setSlopes(address,(uint256,uint256,uint256))"), await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(ethers.id("setLimits(uint256,uint256,uint256)"), await vaultAdapter.getAddress(), owner.address);
    
    await vaultAdapter.initialize(await accessControl.getAddress());
    
    // Set up slopes for the test asset
    const testAsset = ethers.Wallet.createRandom().address;
    const slopes = {
      kink: ethers.parseEther("0.8"), // 80% utilization kink
      slope0: ethers.parseEther("0.05"), // 5% base rate
      slope1: ethers.parseEther("0.5") // 50% slope above kink
    };
    
    // Grant access for setSlopes
    await accessControl.grantAccess(ethers.id("setSlopes(address,(uint256,uint256,uint256))"), await vaultAdapter.getAddress(), owner.address);
    await vaultAdapter.setSlopes(testAsset, slopes);
    
    // Set limits
    await accessControl.grantAccess(ethers.id("setLimits(uint256,uint256,uint256)"), await vaultAdapter.getAddress(), owner.address);
    await vaultAdapter.setLimits(
      ethers.parseEther("2"), // maxMultiplier: 2x
      ethers.parseEther("0.5"), // minMultiplier: 0.5x
      ethers.parseEther("0.1") // rate: 10%
    );
    
    // Set up the mock vault to return specific utilization and index values
    const vaultAddress = await mockVault.getAddress();
    
    // First call to rate() - should use the else branch (no elapsed time)
    // Mock vault will return utilization = 60% and currentUtilizationIndex = 1000
    await mockVault.setUtilization(ethers.parseEther("0.6"));
    await mockVault.setCurrentUtilizationIndex(1000);
    
    // Call rate() - this will set the initial index and lastUpdate
    const rate1 = await vaultAdapter.rate(vaultAddress, testAsset);
    
    // Fast forward time by 100 seconds
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);
    
    // Set new utilization index to 1100 (increased by 100 over 100 seconds)
    // In the original: utilization = (1100 - 1000) / 100 = 1 (1%)
    // In the mutant: utilization = (1100 - 1000) + 100 = 200 (200%)
    await mockVault.setCurrentUtilizationIndex(1100);
    
    // Call rate() again - this will use the if branch (elapsed > 0)
    const rate2 = await vaultAdapter.rate(vaultAddress, testAsset);
    
    // Calculate expected rate with original code:
    // utilization = (1100 - 1000) / 100 = 1 (1%)
    // Since 1% < 80% kink, use else branch:
    // multiplier = multiplier * 1e27 / (1e27 + (1e27 * (0.8 - 0.01) / 0.8) * 100 * 0.1 / 1e27)
    // For simplicity, since this is the first update, multiplier starts at 1e27
    // interestRate = (0.05 * 0.01 / 0.8) * 1e27 / 1e27 = 0.000625 = 0.0625%
    
    // With mutant code:
    // utilization = (1100 - 1000) + 100 = 200 (20000%)
    // Since 20000% > 80% kink, use if branch
    // This will produce a much higher interest rate
    
    // The mutant will produce a significantly different result
    // Original would give ~0.0625% while mutant gives much higher
    expect(rate2).to.be.lessThan(ethers.parseEther("0.01")); // Original would be very small
  });
});

// Mock Vault contract
contract MockVault {
  uint256 private _utilization;
  uint256 private _currentUtilizationIndex;
  
  function setUtilization(uint256 val) external {
    _utilization = val;
  }
  
  function setCurrentUtilizationIndex(uint256 val) external {
    _currentUtilizationIndex = val;
  }
  
  function utilization(address) external view returns (uint256) {
    return _utilization;
  }
  
  function currentUtilizationIndex(address) external view returns (uint256) {
    return _currentUtilizationIndex;
  }
}

// Mock AccessControl contract
contract MockAccessControl {
  mapping(bytes32 => mapping(address => bool)) private _hasAccess;
  
  function grantAccess(bytes4 selector, address contractAddr, address addr) external {
    _hasAccess[keccak256(abi.encodePacked(selector, contractAddr))][addr] = true;
  }
  
  function checkAccess(bytes4 selector, address contractAddr, address caller) external view returns (bool) {
    return _hasAccess[keccak256(abi.encodePacked(selector, contractAddr))][caller];
  }
}