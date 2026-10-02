import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m8491a348 test", function () {
  it("should detect the mutant by checking the interest rate calculation when utilization is below kink", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments based on the provided code)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock vault that implements IVault interface
    // We need a simple contract that returns utilization and currentUtilizationIndex
    const mockVaultFactory = await ethers.getContractFactory("contracts/test/MockVault.sol:MockVault");
    const mockVault = await mockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Initialize the VaultAdapter with access control
    // For testing, we'll deploy a simple access control contract
    const accessControlFactory = await ethers.getContractFactory("contracts/test/MockAccessControl.sol:MockAccessControl");
    const accessControl = await accessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Grant access to the owner for all necessary selectors
    await accessControl.grantAccess(vaultAdapter.interface.getFunction("initialize").selector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(vaultAdapter.interface.getFunction("setSlopes").selector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(vaultAdapter.interface.getFunction("setLimits").selector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(vaultAdapter.interface.getFunction("rate").selector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess("0x00000000", await vaultAdapter.getAddress(), owner.address); // for _authorizeUpgrade
    
    // Initialize the VaultAdapter with the access control contract
    await vaultAdapter.initialize(await accessControl.getAddress());
    
    // Set slopes for an asset with kink > 0 and non-zero slope0
    const assetAddress = addr1.address; // Using addr1 as a dummy asset address
    const slopes = {
      kink: ethers.parseEther("0.8"), // 80% utilization
      slope0: ethers.parseEther("0.05"), // 5% base rate
      slope1: ethers.parseEther("1") // 100% slope after kink
    };
    await vaultAdapter.setSlopes(assetAddress, slopes);
    
    // Set limits
    await vaultAdapter.setLimits(
      ethers.parseEther("5"),   // maxMultiplier: 5x
      ethers.parseEther("0.5"), // minMultiplier: 0.5x
      ethers.parseEther("0.1")  // rate: 10%
    );
    
    // Setup mock vault to return utilization below kink (e.g., 50%)
    const mockVaultAddress = await mockVault.getAddress();
    await mockVault.setUtilization(ethers.parseEther("0.5")); // 50% utilization
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1"));
    
    // Call rate function - this should trigger the else branch (utilization < kink)
    const rate = await vaultAdapter.rate(mockVaultAddress, assetAddress);
    
    // Calculate expected rate using original formula:
    // interestRate = (slopes.slope0 * _utilization / slopes.kink) * utilizationData.multiplier / 1e27
    // With initial multiplier = 1e27 (since it's first call, multiplier starts at 1e27)
    // elapsed = 0 (first call, lastUpdate is 0)
    // Since elapsed = 0, the multiplier stays at 1e27
    const expectedRate = (ethers.parseEther("0.05") * ethers.parseEther("0.5") / ethers.parseEther("0.8")) * ethers.parseEther("1") / ethers.parseEther("1");
    
    // The mutant would produce: (slopes.slope0 + _utilization / slopes.kink) * multiplier / 1e27
    // = (0.05 + 0.5/0.8) * 1 = (0.05 + 0.625) = 0.675
    // Original produces: (0.05 * 0.5 / 0.8) * 1 = 0.03125
    
    expect(rate).to.equal(expectedRate);
    
    // Additional verification: call rate again to test the multiplier update path
    // Advance time to make elapsed > 0
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);
    
    const rate2 = await vaultAdapter.rate(mockVaultAddress, assetAddress);
    // With elapsed > 0, the multiplier will be updated, but the formula difference remains
    expect(rate2).to.not.equal(ethers.parseEther("0.675")); // The mutant value should not match
  });
});